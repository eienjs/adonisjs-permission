import { InvalidArgumentsException } from '@adonisjs/core/exceptions';

export default class WildcardPermissionNotImplementsContract extends InvalidArgumentsException {
  public static create(): WildcardPermissionNotImplementsContract {
    return new this('Wildcard permission class must be implements WildcardContract');
  }
}
