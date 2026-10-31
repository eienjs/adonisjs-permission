import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import type { PermissionMiddlewareOptions } from '../types.js';
import { RuntimeException } from '@adonisjs/core/exceptions';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';

interface AuthContextLike {
  auth?: {
    user?: unknown;
  };
}

interface AuthorizableUserLike {
  hasAnyPermission?: (...permissions: string[]) => Promise<boolean>;
  hasPermissionTo?: (permission: string) => Promise<boolean>;
}

export default class PermissionMiddleware {
  public async handle(
    ctx: HttpContext,
    next: NextFn,
    options: PermissionMiddlewareOptions,
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

    const authorizableUser = user as AuthorizableUserLike;

    if (
      typeof authorizableUser.hasAnyPermission !== 'function'
      && typeof authorizableUser.hasPermissionTo !== 'function'
    ) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.missingMixinHasAuthorizable(user);
    }

    const permissions = Array.isArray(options.permissions)
      ? options.permissions
      : options.permissions.split('|').map((p) => p.trim());

    const hasAccess = authorizableUser.hasAnyPermission
      ? await authorizableUser.hasAnyPermission(...permissions)
      : false;

    if (!hasAccess) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.forPermissions(permissions);
    }

    return next();
  }
}
