import { InvalidArgumentsException } from '@adonisjs/core/exceptions';

export default class RoleDoesNotExist extends InvalidArgumentsException {
  public static named(roleName: string, guardName: string): RoleDoesNotExist {
    return new this(`There is no role named '${roleName}' for guard '${guardName}'`);
  }

  public static withId(roleId: string | number, guardName: string): RoleDoesNotExist {
    return new this(`There is no role with ID '${roleId}' for guard '${guardName}'`);
  }
}
