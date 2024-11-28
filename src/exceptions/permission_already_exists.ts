import { InvalidArgumentsException } from '@adonisjs/core/exceptions';

export default class PermissionAlreadyExists extends InvalidArgumentsException {
  public static create(permissionName: string, guardName: string): PermissionAlreadyExists {
    return new this(`A '${permissionName}' permission already exists for guard '${guardName}'`);
  }
}
