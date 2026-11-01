import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import type { RoleOrPermissionMiddlewareOptions } from '../types/main.js';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';
import { getAuthenticatedUser, parseMiddlewareItems } from '../utils/middleware_utils.js';

export default class RoleOrPermissionMiddleware {
  public async handle(
    ctx: HttpContext,
    next: NextFn,
    options: RoleOrPermissionMiddlewareOptions,
  ): Promise<unknown> {
    const authorizableUser = getAuthenticatedUser(ctx);

    if (
      typeof authorizableUser.hasAnyRole !== 'function'
      && typeof authorizableUser.hasAnyPermission !== 'function'
    ) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.missingMixinHasAuthorizable(authorizableUser);
    }

    const items = parseMiddlewareItems(options.roleOrPermission);

    if (authorizableUser.hasAnyRole && (await authorizableUser.hasAnyRole(...items))) {
      return next();
    }

    if (authorizableUser.hasAnyPermission && (await authorizableUser.hasAnyPermission(...items))) {
      return next();
    }

    throw E_PERMISSION_UNAUTHORIZED_ACCESS.forRolesOrPermissions(items);
  }
}
