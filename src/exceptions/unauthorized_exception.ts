import { Exception } from '@adonisjs/core/exceptions';
import app from '@adonisjs/core/services/app';
import { type LucidModel } from '@adonisjs/lucid/types/model';

export default class UnauthorizedException extends Exception {
  private _requiredRoles: string[] = [];

  private _requiredPermissions: string[] = [];

  public getRequiredRoles(): string[] {
    return this._requiredRoles;
  }

  public getRequiredPermissions(): string[] {
    return this._requiredPermissions;
  }

  public static forRoles(roles: string[]): UnauthorizedException {
    let message = 'User does not have the right roles.';
    if (app.config.get('permission.displayRoleInException', false)) {
      message = `${message} Necessary roles are ${roles.join(', ')}`;
    }

    const exception = new this(message, { status: 403 });
    exception._requiredRoles = roles;

    return exception;
  }

  public static forPermissions(permissions: string[]): UnauthorizedException {
    let message = 'User does not have the right permissions.';
    if (app.config.get('permission.displayPermissionInException', false)) {
      message = `${message} Necessary permissions are ${permissions.join(', ')}`;
    }

    const exception = new this(message, { status: 403 });
    exception._requiredPermissions = permissions;

    return exception;
  }

  public static forRolesOrPermissions(rolesOrPermissions: string[]): UnauthorizedException {
    let message = 'User does not have any of the necessary access rights.';
    if (
      app.config.get('permission.displayPermissionInException', false) &&
      app.config.get('permission.displayRoleInException', false)
    ) {
      message = `${message} Necessary roles or permissions are ${rolesOrPermissions.join(', ')}`;
    }

    const exception = new this(message, { status: 403 });
    exception._requiredPermissions = rolesOrPermissions;
    exception._requiredRoles = rolesOrPermissions;

    return exception;
  }

  public static missingTraitHasRoles(user: LucidModel): UnauthorizedException {
    const className = user.name;

    return new this(`Authorizable class '${className}' must extends of HasRoles`, { status: 403 });
  }

  public static notLoggedIn(): UnauthorizedException {
    return new this('User is not logged in', { status: 403 });
  }
}
