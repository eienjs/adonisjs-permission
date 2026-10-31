import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model';
import type { ManyToMany } from '@adonisjs/lucid/types/relations';
import type {
  ModelConstructor,
  PermissionInstance,
  RoleableMixin,
  RoleModelContract,
  RolePropertiesModel,
} from '../types.js';
import { column, manyToMany } from '@adonisjs/lucid/orm';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';
import { getPivotColumnNames, getPivotTableNames, ModelResolver } from '../model_resolver.js';
import { PermissionRegistrar } from '../registrar.js';

interface RoleInternalInstance {
  id: string | number;
  name: string;
  guardName?: string;
  permissions: PermissionInstance[];
  load: (relation: string) => Promise<void>;
  related: (relation: string) => {
    attach: (ids: (string | number)[]) => Promise<void>;
    sync: (ids: (string | number)[]) => Promise<void>;
    detach: (ids: (string | number)[]) => Promise<void>;
    query: () => {
      where: (col: string, val: unknown) => {
        first: () => Promise<LucidRow | null>;
      };
    };
  };
}

export const roleable = () => {
  return <Model extends NormalizeConstructor<typeof BaseModel>>(
    superclass: Model,
  ): Model & RoleModelContract & ModelConstructor<InstanceType<Model> & RolePropertiesModel & RoleableMixin> => {
    class RoleModel extends superclass {
      @column()
      public declare name: string;

      @column({ columnName: 'guard_name' })
      public declare guardName: string;

      @column({ columnName: getPivotColumnNames().teamForeignKey })
      public declare teamId: string | number | null;

      @manyToMany(() => ModelResolver.getInstance().getPermissionModel() as LucidModel, {
        pivotTable: getPivotTableNames().roleHasPermissions,
        pivotForeignKey: getPivotColumnNames().rolePivotKey,
        pivotRelatedForeignKey: getPivotColumnNames().permissionPivotKey,
      })
      public declare permissions: ManyToMany<LucidModel>;

      public async givePermissionTo(
        ...permissions: (string | LucidRow)[]
      ): Promise<void> {
        const permModels = await this.resolvePermissions(...permissions);
        const self = this as unknown as RoleInternalInstance;
        await self.related('permissions').attach(permModels.map((p) => p.id));
        this.clearRegistrarCache();
      }

      public async syncPermissions(
        ...permissions: (string | LucidRow)[]
      ): Promise<void> {
        const permModels = await this.resolvePermissions(...permissions);
        const self = this as unknown as RoleInternalInstance;
        await self.related('permissions').sync(permModels.map((p) => p.id));
        this.clearRegistrarCache();
      }

      public async revokePermissionTo(
        ...permissions: (string | LucidRow)[]
      ): Promise<void> {
        const permModels = await this.resolvePermissions(...permissions);
        const self = this as unknown as RoleInternalInstance;
        await self.related('permissions').detach(permModels.map((p) => p.id));
        this.clearRegistrarCache();
      }

      public async hasPermissionTo(
        permission: string | LucidRow,
      ): Promise<boolean> {
        const permTarget = typeof permission === 'string' ? permission : (permission as unknown as { name: string }).name;
        const self = this as unknown as RoleInternalInstance;
        const found = await self.related('permissions')
          .query()
          .where('name', permTarget)
          .first();

        return Boolean(found);
      }

      public async hasAnyPermission(
        ...permissions: (string | LucidRow)[]
      ): Promise<boolean> {
        const self = this as unknown as RoleInternalInstance;
        await self.load('permissions');
        const targetNames = new Set(
          permissions.map((p) => (typeof p === 'string' ? p : (p as unknown as { name: string }).name)),
        );

        return self.permissions.some((p) => targetNames.has(p.name));
      }

      public async hasAllPermissions(
        ...permissions: (string | LucidRow)[]
      ): Promise<boolean> {
        const self = this as unknown as RoleInternalInstance;
        await self.load('permissions');
        const targetNames = permissions.map((p) => (typeof p === 'string' ? p : (p as unknown as { name: string }).name));

        return targetNames.every((name) => self.permissions.some((p) => p.name === name));
      }

      public async getPermissionNames(): Promise<string[]> {
        const self = this as unknown as RoleInternalInstance;
        await self.load('permissions');

        return self.permissions.map((p) => p.name);
      }

      protected async resolvePermissions(
        ...permissions: (string | LucidRow)[]
      ): Promise<PermissionInstance[]> {
        const Permission = ModelResolver.getInstance().getPermissionModel();
        const self = this as unknown as RoleInternalInstance;
        const guard = self.guardName ?? ModelResolver.getInstance().config.defaultGuard;

        const results: PermissionInstance[] = [];
        for (const item of permissions) {
          if (typeof item === 'string') {
            const perm = await Permission.findOrCreate({
              name: item,
              guardName: guard,
            });
            results.push(perm);
          } else {
            results.push(item as unknown as PermissionInstance);
          }
        }

        return results;
      }

      protected clearRegistrarCache(): void {
        try {
          PermissionRegistrar.getInstance().forgetCachedPermissions();
        } catch {
          // ignore if registrar not initialized
        }
      }

      public static async findByName(
        this: LucidModel,
        name: string,
        guardName?: string,
        teamId?: string | number | null,
      ): Promise<LucidRow> {
        const resolver = ModelResolver.getInstance();
        const guard = guardName ?? resolver.config.defaultGuard;
        let query = this.query().where('name', name).where('guard_name', guard);

        if (resolver.config.teams) {
          if (teamId === undefined || teamId === null) {
            query = query.whereNull(resolver.config.teamForeignKey);
          } else {
            query = query.where(resolver.config.teamForeignKey, teamId);
          }
        }

        const role = await query.first();
        if (!role) {
          throw E_PERMISSION_UNAUTHORIZED_ACCESS.roleNotFound(name, guard);
        }

        return role;
      }

      public static async findById(
        this: LucidModel,
        id: number | string,
        guardName?: string,
        teamId?: string | number | null,
      ): Promise<LucidRow> {
        const resolver = ModelResolver.getInstance();
        const guard = guardName ?? resolver.config.defaultGuard;
        let query = this.query().where('id', id).where('guard_name', guard);

        if (resolver.config.teams) {
          if (teamId === undefined || teamId === null) {
            query = query.whereNull(resolver.config.teamForeignKey);
          } else {
            query = query.where(resolver.config.teamForeignKey, teamId);
          }
        }

        const role = await query.first();
        if (!role) {
          throw new E_PERMISSION_UNAUTHORIZED_ACCESS(`There is no role with id \`${id.toString()}\``, {
            status: 404,
            code: 'E_ROLE_NOT_FOUND',
          });
        }

        return role;
      }

      public static async findOrCreate(
        this: LucidModel,
        values: { name: string; guardName?: string; teamId?: string | number | null },
      ): Promise<LucidRow> {
        const resolver = ModelResolver.getInstance();
        const guard = values.guardName ?? resolver.config.defaultGuard;
        let query = this.query().where('name', values.name).where('guard_name', guard);

        if (resolver.config.teams) {
          if (values.teamId === undefined || values.teamId === null) {
            query = query.whereNull(resolver.config.teamForeignKey);
          } else {
            query = query.where(resolver.config.teamForeignKey, values.teamId);
          }
        }

        let role = await query.first();
        if (!role) {
          const payload: { name: string; guardName: string; [key: string]: unknown } = {
            name: values.name,
            guardName: guard,
          };
          if (resolver.config.teams && values.teamId !== undefined && values.teamId !== null) {
            payload[resolver.config.teamForeignKey] = values.teamId;
            payload.teamId = values.teamId;
          }
          role = await this.create(payload);
        }

        return role;
      }
    }

    return RoleModel as unknown as Model
      & RoleModelContract
      & ModelConstructor<InstanceType<Model> & RolePropertiesModel & RoleableMixin>;
  };
};

export const Roleable = roleable;
