import { InvalidArgumentsException } from '@adonisjs/core/exceptions';

export default class PermissionDoesNotExist extends InvalidArgumentsException {
  public static create(permissionName: string, guardName: string): PermissionDoesNotExist {
    return new this(`There is no permission named '${permissionName}' for guard '${guardName}'`);
  }

  public static withId(permissionId: string | number, guardName: string): PermissionDoesNotExist {
    return new this(`There is no [permission] with ID '${permissionId}' for guard '${guardName}'`);
  }
}
