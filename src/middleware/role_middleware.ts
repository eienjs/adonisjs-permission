import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import type { RoleMiddlewareOptions } from '../types.js';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';
import { getAuthenticatedUser, parseMiddlewareItems } from '../utils/middleware_utils.js';

export default class RoleMiddleware {
  public async handle(
    ctx: HttpContext,
    next: NextFn,
    options: RoleMiddlewareOptions,
  ): Promise<unknown> {
    const authorizableUser = getAuthenticatedUser(ctx);

    if (
      typeof authorizableUser.hasAnyRole !== 'function'
      && typeof authorizableUser.hasRole !== 'function'
    ) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.missingMixinHasAuthorizable(authorizableUser);
    }

    const roles = parseMiddlewareItems(options.roles);

    const hasAccess = authorizableUser.hasAnyRole
      ? await authorizableUser.hasAnyRole(...roles)
      : false;

    if (!hasAccess) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.forRoles(roles);
    }

    return next();
  }
}
