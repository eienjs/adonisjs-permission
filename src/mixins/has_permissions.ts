import { type NormalizeConstructor } from '@adonisjs/core/types/helpers';
import { type BaseModel } from '@adonisjs/lucid/orm';

export function HasPermissions<Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) {
  class ModelHasPermissions extends superclass {
    private _permissionClass?: string;

    private _wilcardClass?: string;

    private _wilcardPermissionsIndex: string[] = [];

    public async getPermissionClass(): Promise<string> {
      if (! this._permissionClass) {
        this._permissionClass =
      }

      return this._permissionClass;
    }
  }

  return ModelHasPermissions;
}
