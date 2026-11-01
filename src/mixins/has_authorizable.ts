import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';
import type { LucidRow } from '@adonisjs/lucid/types/model';
import type {
  HasAuthorizableMixin,
  ModelConstructor,
  PermissionInstance,
  PrimaryKeyType,
  RoleInstance,
} from '../types.js';
import { compose } from '@adonisjs/core/helpers';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';
import { getModelId, ModelResolver, normalizeId } from '../model_resolver.js';
import { getPermissionsTeamId } from '../team_manager.js';
import { WildcardPermission } from '../wildcard.js';
import { HasPermissions } from './has_permissions.js';
import { HasRoles } from './has_roles.js';

function getModelIdKey(model: { id: PrimaryKeyType; $primaryKeyValue?: PrimaryKeyType }): string {
  return String(getModelId(model));
}

interface AuthorizableWhereHasQuery {
  wherePivot: (col: string, val: unknown) => AuthorizableWhereHasQuery;
  whereNullPivot: (col: string) => AuthorizableWhereHasQuery;
  first: () => Promise<LucidRow | null>;
}

interface AuthorizableRolesQuery {
  wherePivot: (col: string, val: unknown) => AuthorizableRolesQuery;
  whereNullPivot: (col: string) => AuthorizableRolesQuery;
  whereHas: (
    rel: string,
    callback: (q: { where: (col: string, val: unknown) => void }) => void,
  ) => AuthorizableWhereHasQuery;
  then: <TResult1 = RoleInstance[], TResult2 = never>(
    onfulfilled?: ((value: RoleInstance[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

interface AuthorizableInternalInstance {
  currentTeamId?: PrimaryKeyType | null;
  guardName?: string;
  hasRole: (role: string) => Promise<boolean>;
  hasDirectPermission: (permission: string | LucidRow) => Promise<boolean>;
  getDirectPermissions: () => Promise<LucidRow[]>;
  related: (relation: string) => {
    query: () => AuthorizableRolesQuery;
  };
}

export const HasAuthorizable = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
): Model & ModelConstructor<InstanceType<Model> & HasAuthorizableMixin> => {
  const ComposedBase = compose(superclass, HasRoles, HasPermissions) as unknown as typeof BaseModel;
  class ModelWithAuthorizable extends ComposedBase {
    public currentTeamId?: PrimaryKeyType | null;

    public forTeam(teamId: PrimaryKeyType | null): this {
      this.currentTeamId = teamId;

      return this;
    }

    public async hasPermissionViaRole(permission: string | LucidRow): Promise<boolean> {
      const resolver = ModelResolver.getInstance();
      const targetName = typeof permission === 'string' ? permission : (permission as unknown as { name: string }).name;
      const self = this as unknown as AuthorizableInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;
      const morphType = resolver.getMorphType(this.constructor);

      let query = self
        .related('roles')
        .query()
        .whereHas('permissions', (q) => {
          q.where('name', targetName);
        })
        .wherePivot(resolver.config.columnNames.modelMorphType, morphType);

      if (resolver.config.teams) {
        if (teamId === null) {
          query = query.whereNullPivot(resolver.config.teamForeignKey);
        } else {
          query = query.wherePivot(resolver.config.teamForeignKey, teamId);
        }
      }

      const found = await query.first();

      return Boolean(found);
    }

    public async getPermissionsViaRoles(): Promise<LucidRow[]> {
      const resolver = ModelResolver.getInstance();
      const self = this as unknown as AuthorizableInternalInstance;
      const teamId = self.currentTeamId === undefined ? getPermissionsTeamId() : self.currentTeamId;
      const morphType = resolver.getMorphType(this.constructor);

      let query = self
        .related('roles')
        .query()
        .wherePivot(resolver.config.columnNames.modelMorphType, morphType);

      if (resolver.config.teams) {
        if (teamId === null) {
          query = query.whereNullPivot(resolver.config.teamForeignKey);
        } else {
          query = query.wherePivot(resolver.config.teamForeignKey, teamId);
        }
      }

      const roles = await query;
      if (roles.length === 0) {
        return [];
      }

      const Permission = resolver.getPermissionModel();
      const { roleHasPermissions } = resolver.config.tableNames;
      const { rolePivotKey, permissionPivotKey } = resolver.config.columnNames;
      const roleIds = roles.map((r) => normalizeId(getModelId(r)));

      const perms = await Permission.query().whereIn(Permission.primaryKey, (subQuery) => {
        void subQuery
          .from(roleHasPermissions)
          .select(permissionPivotKey)
          .whereIn(rolePivotKey, roleIds);
      });

      return perms;
    }

    public async getAllPermissions(): Promise<LucidRow[]> {
      const self = this as unknown as AuthorizableInternalInstance;
      const direct = (await self.getDirectPermissions()) as unknown as PermissionInstance[];
      const viaRoles = (await this.getPermissionsViaRoles()) as unknown as PermissionInstance[];

      const combined: PermissionInstance[] = [...direct];
      const seen = new Set(direct.map((p) => getModelIdKey(p)));

      for (const perm of viaRoles) {
        const key = getModelIdKey(perm);
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        combined.push(perm);
      }

      return combined;
    }

    public async hasPermissionTo(
      permission: string | LucidRow,
      _guardName?: string,
    ): Promise<boolean> {
      const resolver = ModelResolver.getInstance();
      const targetName = typeof permission === 'string' ? permission : (permission as unknown as { name: string }).name;
      const self = this as unknown as AuthorizableInternalInstance;

      // 1. Check Super-Admin bypass
      if (
        resolver.config.superAdmin.enabled
        && resolver.config.superAdmin.role
        && (await self.hasRole(resolver.config.superAdmin.role))
      ) {
        return true;
      }

      // 2. Direct permission
      if (await self.hasDirectPermission(permission)) {
        return true;
      }

      // 3. Permission via role
      if (await this.hasPermissionViaRole(permission)) {
        return true;
      }

      // 4. Wildcard matching
      if (resolver.config.enableWildcardPermission) {
        const allPerms = (await this.getAllPermissions()) as unknown as PermissionInstance[];
        for (const p of allPerms) {
          if (WildcardPermission.implies(p.name, targetName)) {
            return true;
          }
        }
      }

      return false;
    }

    public async checkPermissionTo(
      permission: string | LucidRow,
      guardName?: string,
    ): Promise<boolean> {
      const targetName = typeof permission === 'string' ? permission : (permission as unknown as { name: string }).name;

      if (await this.hasPermissionTo(permission, guardName)) {
        return true;
      }

      throw E_PERMISSION_UNAUTHORIZED_ACCESS.forPermissions([targetName]);
    }

    public async can(permission: string | LucidRow): Promise<boolean> {
      return this.hasPermissionTo(permission);
    }

    public async cannot(permission: string | LucidRow): Promise<boolean> {
      return !(await this.can(permission));
    }
  }

  return ModelWithAuthorizable as unknown as Model
    & ModelConstructor<InstanceType<Model> & HasAuthorizableMixin>;
};
