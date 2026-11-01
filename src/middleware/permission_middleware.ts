import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import type { PermissionMiddlewareOptions } from '../types.js';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';
import { getAuthenticatedUser, parseMiddlewareItems } from '../utils/middleware_utils.js';

export default class PermissionMiddleware {
  public async handle(
    ctx: HttpContext,
    next: NextFn,
    options: PermissionMiddlewareOptions,
  ): Promise<unknown> {
    const authorizableUser = getAuthenticatedUser(ctx);

    if (
      typeof authorizableUser.hasAnyPermission !== 'function'
      && typeof authorizableUser.hasPermissionTo !== 'function'
    ) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.missingMixinHasAuthorizable(authorizableUser);
    }

    const permissions = parseMiddlewareItems(options.permissions);

    const hasAccess = authorizableUser.hasAnyPermission
      ? await authorizableUser.hasAnyPermission(...permissions)
      : false;

    if (!hasAccess) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.forPermissions(permissions);
    }

    return next();
  }
}
