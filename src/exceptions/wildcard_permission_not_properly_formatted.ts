import { InvalidArgumentsException } from '@adonisjs/core/exceptions';

export default class WildcardPermissionNotProperlyFormatted extends InvalidArgumentsException {
  public static create(permission: string): WildcardPermissionNotProperlyFormatted {
    return new this(`Wildcard permission '${permission}' is not properly formatted`);
  }
}
