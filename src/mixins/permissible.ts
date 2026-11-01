import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model';
import type { ManyToMany } from '@adonisjs/lucid/types/relations';
import type {
  ModelConstructor,
  PermissibleMixin,
  PermissionModelContract,
  PermissionPropertiesModel,
} from '../types.js';
import { column, manyToMany } from '@adonisjs/lucid/orm';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';
import { getPivotColumnNames, getPivotTableNames, ModelResolver } from '../model_resolver.js';

export const Permissible = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
): Model
  & PermissionModelContract
  & ModelConstructor<InstanceType<Model> & PermissionPropertiesModel & PermissibleMixin> => {
  class PermissionModel extends superclass {
    @column()
    public declare name: string;

    @column({ columnName: 'guard_name' })
    public declare guardName: string;

    @manyToMany(() => ModelResolver.getInstance().getRoleModel() as LucidModel, {
      pivotTable: getPivotTableNames().roleHasPermissions,
      pivotForeignKey: getPivotColumnNames().permissionPivotKey,
      pivotRelatedForeignKey: getPivotColumnNames().rolePivotKey,
    })
    public declare roles: ManyToMany<LucidModel>;

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

      const { modelHasPermissions } = resolver.config.tableNames;
      const { permissionPivotKey, modelMorphKey, modelMorphType } = resolver.config.columnNames;
      const self = this as unknown as { id: string | number };

      return TargetModel.query().whereIn(TargetModel.primaryKey, (subQuery) => {
        void subQuery
          .from(modelHasPermissions)
          .select(modelMorphKey)
          .where(permissionPivotKey, self.id)
          .where(modelMorphType, morphType);
      });
    }

    public static async findByName(
      this: LucidModel,
      name: string,
      guardName?: string,
    ): Promise<LucidRow> {
      const resolver = ModelResolver.getInstance();
      const guard = guardName ?? resolver.config.defaultGuard;
      const permission = await this.query().where('name', name).where('guard_name', guard).first();

      if (!permission) {
        throw E_PERMISSION_UNAUTHORIZED_ACCESS.permissionNotFound(name, guard);
      }

      return permission;
    }

    public static async findById(
      this: LucidModel,
      id: number | string,
      guardName?: string,
    ): Promise<LucidRow> {
      const resolver = ModelResolver.getInstance();
      const guard = guardName ?? resolver.config.defaultGuard;
      const permission = await this.query().where('id', id).where('guard_name', guard).first();

      if (!permission) {
        throw new E_PERMISSION_UNAUTHORIZED_ACCESS(`There is no permission with id \`${id}\``, {
          status: 404,
          code: 'E_PERMISSION_NOT_FOUND',
        });
      }

      return permission;
    }

    public static async findOrCreate(
      this: LucidModel,
      values: { name: string; guardName?: string },
    ): Promise<LucidRow> {
      const resolver = ModelResolver.getInstance();
      const guard = values.guardName ?? resolver.config.defaultGuard;
      let permission = await this.query()
        .where('name', values.name)
        .where('guard_name', guard)
        .first();

      permission ??= await this.create({
        name: values.name,
        guardName: guard,
      });

      return permission;
    }
  }

  return PermissionModel as unknown as Model
    & PermissionModelContract
    & ModelConstructor<InstanceType<Model> & PermissionPropertiesModel & PermissibleMixin>;
};
