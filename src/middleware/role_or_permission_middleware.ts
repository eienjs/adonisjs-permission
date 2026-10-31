import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
import type { RoleOrPermissionMiddlewareOptions } from '../types.js';
import { RuntimeException } from '@adonisjs/core/exceptions';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';

interface AuthContextLike {
  auth?: {
    user?: unknown;
  };
}

interface AuthorizableUserLike {
  hasAnyPermission?: (...permissions: string[]) => Promise<boolean>;
  hasAnyRole?: (...roles: string[]) => Promise<boolean>;
}

export default class RoleOrPermissionMiddleware {
  public async handle(
    ctx: HttpContext,
    next: NextFn,
    options: RoleOrPermissionMiddlewareOptions,
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
      typeof authorizableUser.hasAnyRole !== 'function'
      && typeof authorizableUser.hasAnyPermission !== 'function'
    ) {
      throw E_PERMISSION_UNAUTHORIZED_ACCESS.missingMixinHasAuthorizable(user);
    }

    const items = Array.isArray(options.roleOrPermission)
      ? options.roleOrPermission
      : options.roleOrPermission.split('|').map((item) => item.trim());

    if (authorizableUser.hasAnyRole && (await authorizableUser.hasAnyRole(...items))) {
      return next();
    }

    if (authorizableUser.hasAnyPermission && (await authorizableUser.hasAnyPermission(...items))) {
      return next();
    }

    throw E_PERMISSION_UNAUTHORIZED_ACCESS.forRolesOrPermissions(items);
  }
}
