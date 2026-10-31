import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model';
import type { ManyToMany } from '@adonisjs/lucid/types/relations';
import type {
  ModelConstructor,
  PermissibleProperties,
  PermissionModelContract,
  PermissionPropertiesModel,
} from '../types.js';
import { column, manyToMany } from '@adonisjs/lucid/orm';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';
import { getPivotColumnNames, getPivotTableNames, ModelResolver } from '../model_resolver.js';

export const permissible = () => {
  return <Model extends NormalizeConstructor<typeof BaseModel>>(
    superclass: Model,
  ): Model
    & PermissionModelContract
    & ModelConstructor<InstanceType<Model> & PermissionPropertiesModel & PermissibleProperties> => {
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
      & ModelConstructor<InstanceType<Model> & PermissionPropertiesModel & PermissibleProperties>;
  };
};

export const Permissible = permissible;
