import type { ModelResolver } from './model_resolver.js';
import type { PermissionRegistrar } from './registrar.js';
import type { CountRow, ResolvedPermissionsConfig } from './types/internal.js';
import type {
  CatalogInspectionResult,
  PermissionInstance,
  PrimaryKeyType,
  RoleInstance,
  SyncOptions,
  SyncResult,
} from './types/main.js';
import { getModelId, normalizeId } from './utils/model_utils.js';

export class CatalogSyncer {
  public constructor(
    private config: ResolvedPermissionsConfig,
    private modelResolver: ModelResolver,
    private registrar?: PermissionRegistrar,
  ) {}

  public async inspect(options?: {
    guard?: string;
    teamId?: PrimaryKeyType | null;
  }): Promise<CatalogInspectionResult> {
    const guard = options?.guard ?? this.config.defaultGuard;
    const teamId = options?.teamId ?? null;

    const catalogPermsSet = new Set<string>(this.config.catalog.permissions);
    const catalogRolesRecord = this.config.catalog.roles;
    const rolePermissionsValues = Object.values(catalogRolesRecord);

    for (const perms of rolePermissionsValues) {
      for (const p of perms) {
        catalogPermsSet.add(p);
      }
    }
    const catalogPermissions = [...catalogPermsSet];
    const catalogRoles = Object.keys(catalogRolesRecord);

    const Permission = this.modelResolver.getPermissionModel();
    const Role = this.modelResolver.getRoleModel();
    const { client } = Role.query();

    // Query existing permissions from DB for guard
    const permQuery = Permission.query().where('guard_name', guard);
    const dbPermissions = (await permQuery) as unknown as PermissionInstance[];

    const dbPermNames = new Set(dbPermissions.map((p) => p.name));
    const missingPermissions = catalogPermissions.filter((p) => !dbPermNames.has(p));

    const obsoletePermModels = dbPermissions.filter((p) => !catalogPermsSet.has(p.name));
    const obsoletePermissions: { id: PrimaryKeyType; name: string; assignedCount: number }[] = [];

    const modelHasPermsTable = this.config.tableNames.modelHasPermissions;
    const roleHasPermsTable = this.config.tableNames.roleHasPermissions;
    const permPivotKey = this.config.columnNames.permissionPivotKey;

    for (const perm of obsoletePermModels) {
      const permId = getModelId(perm);
      const normalizedPermId = normalizeId(permId);
      const modelAssignments = (await client
        .from(modelHasPermsTable)
        .where(permPivotKey, normalizedPermId)
        .count('* as total')) as CountRow[];
      const roleAssignments = (await client
        .from(roleHasPermsTable)
        .where(permPivotKey, normalizedPermId)
        .count('* as total')) as CountRow[];

      const modelCount = Number(modelAssignments[0]?.total ?? 0);
      const roleCount = Number(roleAssignments[0]?.total ?? 0);

      obsoletePermissions.push({
        id: permId,
        name: perm.name,
        assignedCount: modelCount + roleCount,
      });
    }

    // Query existing roles from DB for guard (and teamId if teams enabled)
    let roleQuery = Role.query().where('guard_name', guard);
    if (this.config.teams) {
      if (teamId === null) {
        roleQuery = roleQuery.whereNull(this.config.teamForeignKey);
      } else {
        roleQuery = roleQuery.where(this.config.teamForeignKey, normalizeId(teamId));
      }
    }
    const dbRoles = (await roleQuery) as unknown as RoleInstance[];
    const dbRoleNames = new Set(dbRoles.map((r) => r.name));

    const missingRoles = catalogRoles.filter((r) => !dbRoleNames.has(r));
    const obsoleteRoleModels = dbRoles.filter((r) => !catalogRoles.includes(r.name));
    const obsoleteRoles: { id: PrimaryKeyType; name: string; assignedCount: number }[] = [];

    const modelHasRolesTable = this.config.tableNames.modelHasRoles;
    const { rolePivotKey } = this.config.columnNames;

    for (const role of obsoleteRoleModels) {
      const roleId = getModelId(role);
      const modelAssignments = (await client
        .from(modelHasRolesTable)
        .where(rolePivotKey, normalizeId(roleId))
        .count('* as total')) as CountRow[];
      const count = Number(modelAssignments[0]?.total ?? 0);
      obsoleteRoles.push({
        id: roleId,
        name: role.name,
        assignedCount: count,
      });
    }

    // Check role permission changes
    const rolesWithPermissionChanges: {
      role: string;
      toAttach: string[];
      toDetach: string[];
    }[] = [];

    for (const roleName of catalogRoles) {
      const roleModel = dbRoles.find((r) => r.name === roleName);

      if (!roleModel) {
        continue;
      }

      const targetPermissions = this.config.catalog.roles[roleName];
      const currentPermNames = await roleModel.getPermissionNames();
      const toAttach = targetPermissions.filter((p) => !currentPermNames.includes(p));
      const toDetach = currentPermNames.filter((p) => !targetPermissions.includes(p));

      if (toAttach.length > 0 || toDetach.length > 0) {
        rolesWithPermissionChanges.push({
          role: roleName,
          toAttach,
          toDetach,
        });
      }
    }

    return {
      missingPermissions,
      obsoletePermissions,
      missingRoles,
      obsoleteRoles,
      rolesWithPermissionChanges,
    };
  }

  public async syncAll(options?: SyncOptions): Promise<SyncResult> {
    const guard = options?.guard ?? this.config.defaultGuard;
    const teamId = options?.teamId ?? null;
    const prune = options?.prune ?? true;
    const force = options?.force ?? false;

    const inspection = await this.inspect({ guard, teamId });

    const assignedObsoleteRoles = inspection.obsoleteRoles.filter((r) => r.assignedCount > 0);
    const assignedObsoletePerms = inspection.obsoletePermissions.filter((p) => p.assignedCount > 0);

    let allowPruningAssigned = force;

    if (
      prune
      && !force
      && options?.confirmHandler
      && (assignedObsoleteRoles.length > 0 || assignedObsoletePerms.length > 0)
    ) {
      allowPruningAssigned = await options.confirmHandler({
        roles: assignedObsoleteRoles.map((r) => ({ name: r.name, assignedCount: r.assignedCount })),
        permissions: assignedObsoletePerms.map((p) => ({
          name: p.name,
          assignedCount: p.assignedCount,
        })),
      });
    }

    const Permission = this.modelResolver.getPermissionModel();
    const Role = this.modelResolver.getRoleModel();

    const result: SyncResult = {
      permissions: { created: [], pruned: [], preserved: [] },
      roles: { created: [], pruned: [], preserved: [], synced: {} },
    };

    // 1. Create missing permissions
    for (const permName of inspection.missingPermissions) {
      await Permission.findOrCreate({
        name: permName,
        guardName: guard,
      });
      result.permissions.created.push(permName);
    }

    // 2. Prune obsolete permissions
    if (prune) {
      for (const obsolete of inspection.obsoletePermissions) {
        if (!allowPruningAssigned && obsolete.assignedCount > 0) {
          result.permissions.preserved.push(obsolete.name);
          continue;
        }

        const perm = await Permission.find(obsolete.id);
        if (!perm) {
          continue;
        }

        await perm.delete();
        result.permissions.pruned.push(obsolete.name);
      }
    }

    // 3. Create missing roles and sync permissions
    const catalogRolesList = Object.keys(this.config.catalog.roles);
    for (const roleName of catalogRolesList) {
      const payload: { name: string; guardName: string; [key: string]: unknown } = {
        name: roleName,
        guardName: guard,
      };
      if (this.config.teams) {
        payload[this.config.teamForeignKey] = teamId;
      }

      const role = await Role.findOrCreate(payload);
      const isNew = inspection.missingRoles.includes(roleName);
      if (isNew) {
        result.roles.created.push(roleName);
      }

      const targetPerms = this.config.catalog.roles[roleName] ?? [];
      await role.syncPermissions(...targetPerms);
      result.roles.synced[roleName] = targetPerms;
    }

    // 4. Prune obsolete roles
    if (prune) {
      for (const obsolete of inspection.obsoleteRoles) {
        if (!allowPruningAssigned && obsolete.assignedCount > 0) {
          result.roles.preserved.push(obsolete.name);
          continue;
        }

        const role = await Role.find(obsolete.id);
        if (!role) {
          continue;
        }

        await role.delete();
        result.roles.pruned.push(obsolete.name);
      }
    }

    // Clear permissions cache
    if (this.registrar) {
      this.registrar.forgetCachedPermissions();
    }

    return result;
  }
}
