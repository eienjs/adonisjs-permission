import { InvalidArgumentsException } from '@adonisjs/core/exceptions';

export default class RoleAlreadyExists extends InvalidArgumentsException {
  public static create(roleName: string, guardName: string): RoleAlreadyExists {
    return new this(`A role '${roleName}' already exists for guard ${guardName}`);
  }
}
