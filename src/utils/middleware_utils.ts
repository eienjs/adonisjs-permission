import type { HttpContext } from '@adonisjs/core/http';
import { RuntimeException } from '@adonisjs/core/exceptions';
import { E_PERMISSION_UNAUTHORIZED_ACCESS } from '../errors.js';

interface AuthContextLike {
  auth?: {
    user?: AuthorizableUserContract;
  };
}

export interface AuthorizableUserContract {
  hasAnyPermission?: (...permissions: string[]) => Promise<boolean>;
  hasPermissionTo?: (permission: string) => Promise<boolean>;
  hasAnyRole?: (...roles: string[]) => Promise<boolean>;
  hasRole?: (role: string) => Promise<boolean>;
}

/**
 * Extracts and validates authenticated user from HttpContext.
 */
export function getAuthenticatedUser(ctx: HttpContext): AuthorizableUserContract {
  if (!('auth' in ctx)) {
    ctx.logger.warn('Cannot get auth module in context, did you forget to enable auth?');
    throw new RuntimeException('Missing auth module in HttpContext');
  }

  const authCtx = ctx as unknown as AuthContextLike;
  const user = authCtx.auth?.user;

  if (!user) {
    throw E_PERMISSION_UNAUTHORIZED_ACCESS.notLoggedIn();
  }

  return user;
}

/**
 * Parses pipe-separated or array middleware items and filters empty tokens.
 */
export function parseMiddlewareItems(items: string | string[]): string[] {
  const list = Array.isArray(items)
    ? items
    : items.split('|').map((item) => item.trim());

  return list.filter((item) => item.length > 0);
}
