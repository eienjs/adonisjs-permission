import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import type { RoleMiddlewareOptions } from '../types.js';
import { RuntimeException } from '@adonisjs/core/exceptions';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';

interface AuthContextLike {
  auth?: {
    user?: unknown;
  };
}

interface AuthorizableRoleUserLike {
  hasAnyRole?: (...roles: string[]) => Promise<boolean>;
  hasRole?: (role: string) => Promise<boolean>;
}

export default class RoleMiddleware {
  public async handle(
    ctx: HttpContext,
    next: NextFn,
    options: RoleMiddlewareOptions,
  ): Promise<unknown> {
    if (!('auth' in ctx)) {
      ctx.logger.warn('Cannot get auth module in context, did you forget to enable auth?');
      throw new RuntimeException('Missing auth module in HttpContext');
    }

    const authCtx = ctx as unknown as AuthContextLike;
    const user = authCtx.auth?.user;

    if (!user) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.notLoggedIn();
    }

    const authorizableUser = user as AuthorizableRoleUserLike;

    if (
      typeof authorizableUser.hasAnyRole !== 'function'
      && typeof authorizableUser.hasRole !== 'function'
    ) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.missingMixinHasAuthorizable(user);
    }

    const roles = Array.isArray(options.roles)
      ? options.roles
      : options.roles.split('|').map((r) => r.trim());

    const hasAccess = authorizableUser.hasAnyRole
      ? await authorizableUser.hasAnyRole(...roles)
      : false;

    if (!hasAccess) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.forRoles(roles);
    }

    return next();
  }
}
