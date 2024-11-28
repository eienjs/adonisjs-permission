import { InvalidArgumentsException } from '@adonisjs/core/exceptions';

export default class WildcardPermissionInvalidArgument extends InvalidArgumentsException {
  public static create(): WildcardPermissionInvalidArgument {
    return new this('Wildcard permission must be string, permission id or permission instance');
  }
}
