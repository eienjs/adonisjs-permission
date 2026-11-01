import type { HttpContext } from '@adonisjs/core/http';
import type { I18nLike } from './types/internal.js';
import { Exception } from '@adonisjs/core/exceptions';

// eslint-disable-next-line @typescript-eslint/naming-convention
export class E_PERMISSION_UNAUTHORIZED_ACCESS extends Exception {
  public static status = 403;

  public static code = 'E_PERMISSION_UNAUTHORIZED_ACCESS';

  public identifier = 'errors.E_PERMISSION_UNAUTHORIZED_ACCESS';

  public requiredRoles: string[] = [];

  public requiredPermissions: string[] = [];

  public getMessage(ctx: HttpContext): string {
    if ('i18n' in ctx) {
      const i18n = ctx.i18n as I18nLike;

      return i18n.t(this.identifier, {}, this.message);
    }

    return this.message;
  }

  public handle(error: this, ctx: HttpContext): void {
    const message = this.getMessage(ctx);

    if (ctx.request.accepts(['html', 'json']) === 'json') {
      ctx.response.status(error.status).send({
        errors: [
          {
            message,
            code: error.code,
            status: error.status,
            roles: this.requiredRoles,
            permissions: this.requiredPermissions,
          },
        ],
      });

      return;
    }

    ctx.response.status(error.status).send(message);
  }

  public static notLoggedIn(): E_PERMISSION_UNAUTHORIZED_ACCESS {
    return new E_PERMISSION_UNAUTHORIZED_ACCESS('User is not logged in', {
      status: this.status,
      code: this.code,
    });
  }

  public static missingMixinHasAuthorizable(user: unknown): E_PERMISSION_UNAUTHORIZED_ACCESS {
    const className
      = user && typeof user === 'object' && 'constructor' in user ? user.constructor.name : 'Unknown';

    return new E_PERMISSION_UNAUTHORIZED_ACCESS(
      `Authorizable class '${className}' must extend mixin HasAuthorizable`,
      {
        status: this.status,
        code: this.code,
      },
    );
  }

  public static forPermissions(permissions: string[]): E_PERMISSION_UNAUTHORIZED_ACCESS {
    const exception = new E_PERMISSION_UNAUTHORIZED_ACCESS(
      'User does not have the right permissions',
      {
        status: this.status,
        code: this.code,
      },
    );
    exception.requiredPermissions = permissions;

    return exception;
  }

  public static forRoles(roles: string[]): E_PERMISSION_UNAUTHORIZED_ACCESS {
    const exception = new E_PERMISSION_UNAUTHORIZED_ACCESS('User does not have the right roles', {
      status: this.status,
      code: this.code,
    });
    exception.requiredRoles = roles;

    return exception;
  }

  public static forRolesOrPermissions(roleOrPermissions: string[]): E_PERMISSION_UNAUTHORIZED_ACCESS {
    const exception = new E_PERMISSION_UNAUTHORIZED_ACCESS(
      'User does not have any of the necessary access rights',
      {
        status: this.status,
        code: this.code,
      },
    );
    exception.requiredPermissions = roleOrPermissions;
    exception.requiredRoles = roleOrPermissions;

    return exception;
  }

  public static roleNotFound(name: string, guard?: string): E_PERMISSION_UNAUTHORIZED_ACCESS {
    const message = guard
      ? `There is no role named \`${name}\` for guard \`${guard}\``
      : `There is no role named \`${name}\``;

    return new E_PERMISSION_UNAUTHORIZED_ACCESS(message, {
      status: 404,
      code: 'E_ROLE_NOT_FOUND',
    });
  }

  public static permissionNotFound(name: string, guard?: string): E_PERMISSION_UNAUTHORIZED_ACCESS {
    const message = guard
      ? `There is no permission named \`${name}\` for guard \`${guard}\``
      : `There is no permission named \`${name}\``;

    return new E_PERMISSION_UNAUTHORIZED_ACCESS(message, {
      status: 404,
      code: 'E_PERMISSION_NOT_FOUND',
    });
  }
}
