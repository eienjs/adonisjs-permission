import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model';
import type { ManyToMany } from '@adonisjs/lucid/types/relations';
import type {
  ModelConstructor,
  PrimaryKeyType,
  RoleableMixin,
  RoleModelContract,
  RolePropertiesModel,
} from '../types.js';
import { compose } from '@adonisjs/core/helpers';
import { column, manyToMany } from '@adonisjs/lucid/orm';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';
import {
  getModelId,
  getPivotColumnNames,
  getPivotTableNames,
  ModelResolver,
  normalizeId,
} from '../model_resolver.js';
import { HasPermissions } from './has_permissions.js';

export const Roleable = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
): Model & RoleModelContract & ModelConstructor<InstanceType<Model> & RolePropertiesModel & RoleableMixin> => {
  const ComposedBase = compose(superclass, HasPermissions) as unknown as typeof BaseModel;

  class RoleModel extends ComposedBase {
    protected usesMorphPivot = false;

    @column()
    public declare name: string;

    @column({ columnName: 'guard_name' })
    public declare guardName: string;

    @column({ columnName: getPivotColumnNames().teamForeignKey })
    public declare teamId: PrimaryKeyType | null;

    @manyToMany(() => ModelResolver.getInstance().getPermissionModel() as LucidModel, {
      pivotTable: getPivotTableNames().roleHasPermissions,
      pivotForeignKey: getPivotColumnNames().rolePivotKey,
      pivotRelatedForeignKey: getPivotColumnNames().permissionPivotKey,
    })
    public declare permissions: ManyToMany<LucidModel>;

    public async modelsFor<T extends LucidModel = LucidModel>(
      modelOrMorphType: string | T,
    ): Promise<InstanceType<T>[]> {
      const resolver = ModelResolver.getInstance();
      const TargetModel = (
        typeof modelOrMorphType === 'string'
          ? resolver.getMorphModel(modelOrMorphType)
          : modelOrMorphType
      ) as T;
      const morphType = typeof modelOrMorphType === 'string'
        ? modelOrMorphType
        : resolver.getMorphType(TargetModel);

      const { modelHasRoles } = resolver.config.tableNames;
      const { rolePivotKey, modelMorphKey, modelMorphType } = resolver.config.columnNames;
      const self = this as unknown as { id: PrimaryKeyType; $primaryKeyValue?: PrimaryKeyType };
      const roleId = normalizeId(getModelId(self));

      return TargetModel.query().whereIn(TargetModel.primaryKey, (subQuery) => {
        void subQuery
          .from(modelHasRoles)
          .select(modelMorphKey)
          .where(rolePivotKey, roleId)
          .where(modelMorphType, morphType);
      });
    }

    public static async findByName(
      this: LucidModel,
      name: string,
      guardName?: string,
      teamId?: PrimaryKeyType | null,
    ): Promise<LucidRow> {
      const resolver = ModelResolver.getInstance();
      const guard = guardName ?? resolver.config.defaultGuard;
      let query = this.query().where('name', name).where('guard_name', guard);

      if (resolver.config.teams) {
        if (teamId === undefined || teamId === null) {
          query = query.whereNull(resolver.config.teamForeignKey);
        } else {
          query = query.where(resolver.config.teamForeignKey, normalizeId(teamId));
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
      id: PrimaryKeyType,
      guardName?: string,
      teamId?: PrimaryKeyType | null,
    ): Promise<LucidRow> {
      const resolver = ModelResolver.getInstance();
      const guard = guardName ?? resolver.config.defaultGuard;
      let query = this.query().where(this.primaryKey, normalizeId(id)).where('guard_name', guard);

      if (resolver.config.teams) {
        if (teamId === undefined || teamId === null) {
          query = query.whereNull(resolver.config.teamForeignKey);
        } else {
          query = query.where(resolver.config.teamForeignKey, normalizeId(teamId));
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
      values: {
        name: string;
        guardName?: string;
        teamId?: PrimaryKeyType | null;
        [key: string]: unknown;
      },
    ): Promise<LucidRow> {
      const resolver = ModelResolver.getInstance();
      const guard = values.guardName ?? resolver.config.defaultGuard;
      let query = this.query().where('name', values.name).where('guard_name', guard);

      if (resolver.config.teams) {
        if (values.teamId === undefined || values.teamId === null) {
          query = query.whereNull(resolver.config.teamForeignKey);
        } else {
          query = query.where(resolver.config.teamForeignKey, normalizeId(values.teamId));
        }
      }

      let role = await query.first();
      if (!role) {
        const { name, guardName: _guardName, teamId, ...rest } = values;
        const payload: { name: string; guardName: string; [key: string]: unknown } = {
          ...rest,
          name,
          guardName: guard,
        };
        if (teamId !== undefined && teamId !== null && resolver.config.teams) {
          payload[resolver.config.teamForeignKey] = teamId;
          payload.teamId = teamId;
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
