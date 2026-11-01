import type { ModelResolver } from './model_resolver.js';
import type {
  PermissionInstance,
  PrimaryKeyType,
  ResolvedPermissionsConfig,
  RoleInstance,
} from './types.js';

export interface CachedPermissionData {
  id: PrimaryKeyType;
  name: string;
  guardName: string;
  roles: { id: PrimaryKeyType; name: string; guardName: string; teamId?: PrimaryKeyType | null }[];
}

export class PermissionRegistrar {
  private static instance: PermissionRegistrar | null = null;

  private memoryCache: CachedPermissionData[] | null = null;

  private cacheExpiresAt: number | null = null;

  public constructor(
    private config: ResolvedPermissionsConfig,
    private modelResolver: ModelResolver,
  ) {}

  public async getPermissions(): Promise<CachedPermissionData[]> {
    if (!this.config.cache.enabled) {
      return this.loadPermissionsFromDb();
    }

    const now = Date.now();
    if (this.memoryCache && this.cacheExpiresAt && this.cacheExpiresAt > now) {
      return this.memoryCache;
    }

    const permissions = await this.loadPermissionsFromDb();
    this.memoryCache = permissions;

    const ttlMs = this.parseTtl(this.config.cache.ttl);
    this.cacheExpiresAt = now + ttlMs;

    return permissions;
  }

  public clearCache(): void {
    this.memoryCache = null;
    this.cacheExpiresAt = null;
  }

  public forgetCachedPermissions(): void {
    this.clearCache();
  }

  public static getInstance(): PermissionRegistrar {
    if (!this.instance) {
      throw new Error(
        'PermissionRegistrar has not been initialized. Make sure PermissionsProvider is registered.',
      );
    }

    return this.instance;
  }

  public static setInstance(registrar: PermissionRegistrar): void {
    this.instance = registrar;
  }

  private async loadPermissionsFromDb(): Promise<CachedPermissionData[]> {
    const Permission = this.modelResolver.getPermissionModel();
    const Role = this.modelResolver.getRoleModel();
    const { roleHasPermissions } = this.config.tableNames;
    const { rolePivotKey, permissionPivotKey } = this.config.columnNames;

    const permissions = (await Permission.query()) as unknown as PermissionInstance[];
    const allRoles = (await Role.query()) as unknown as RoleInstance[];
    const pivotRows = (await Permission.query()
      .client
      .from(roleHasPermissions)
      .select(permissionPivotKey, rolePivotKey)) as Record<string, PrimaryKeyType>[];

    const roleById = new Map<string, RoleInstance>();
    for (const r of allRoles) {
      const rId = (r as { $primaryKeyValue?: PrimaryKeyType }).$primaryKeyValue ?? r.id;
      roleById.set(String(rId), r);
    }

    const rolesByPermId = new Map<string, RoleInstance[]>();
    for (const row of pivotRows) {
      const permKey = String(row[permissionPivotKey]);
      const roleKey = String(row[rolePivotKey]);
      const matchedRole = roleById.get(roleKey);
      if (!matchedRole) {
        continue;
      }

      const list = rolesByPermId.get(permKey) ?? [];
      list.push(matchedRole);
      rolesByPermId.set(permKey, list);
    }

    return permissions.map((perm) => {
      const permId = (perm as { $primaryKeyValue?: PrimaryKeyType }).$primaryKeyValue ?? perm.id;
      const permRoles = rolesByPermId.get(String(permId)) ?? [];
      const roles = permRoles.map((r) => ({
        id: (r as { $primaryKeyValue?: PrimaryKeyType }).$primaryKeyValue ?? r.id,
        name: r.name,
        guardName: r.guardName ?? this.config.defaultGuard,
        teamId: r.teamId ?? null,
      }));

      return {
        id: permId,
        name: perm.name,
        guardName: perm.guardName ?? this.config.defaultGuard,
        roles,
      };
    });
  }

  private parseTtl(ttl: string | number | undefined): number {
    if (typeof ttl === 'number') {
      return ttl;
    }

    if (!ttl) {
      return 24 * 60 * 60 * 1000;
    }

    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) {
      return 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': {
        return value * 1000;
      }
      case 'm': {
        return value * 60 * 1000;
      }
      case 'h': {
        return value * 60 * 60 * 1000;
      }
      case 'd': {
        return value * 24 * 60 * 60 * 1000;
      }
      default: {
        return 24 * 60 * 60 * 1000;
      }
    }
  }
}
