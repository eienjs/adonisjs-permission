import type { HttpContext } from '@adonisjs/core/http';
import { test } from '@japa/runner';
import PermissionMiddleware from '../src/middleware/permission_middleware.js';
import RoleMiddleware from '../src/middleware/role_middleware.js';
import RoleOrPermissionMiddleware from '../src/middleware/role_or_permission_middleware.js';
import {
  createDatabase,
  createTables,
  Permission,
  Role,
  setupApp,
  User,
} from '../tests_helpers/helpers.js';

test.group('Middlewares', (group) => {
  group.each.setup(async () => {
    const { app } = await setupApp();
    const db = await createDatabase(app);
    await createTables(db);
  });

  const createMockContext = (user: unknown): HttpContext => {
    return {
      auth: { user },
      request: {
        accepts: () => 'json',
      },
      response: {
        status: () => ({
          send: () => true,
        }),
      },
      logger: {
        warn: () => true,
      },
    } as unknown as HttpContext;
  };

  test('RoleMiddleware allows access when user has role', async ({ assert }) => {
    const user = await User.create({ username: 'mod' });
    await Role.findOrCreate({ name: 'moderator', guardName: 'web' });
    await user.assignRole('moderator');

    const middleware = new RoleMiddleware();
    const ctx = createMockContext(user);
    let calledNext = false;

    await middleware.handle(
      ctx,
      async () => {
        calledNext = true;
        await Promise.resolve();
      },
      { roles: 'moderator' },
    );

    assert.isTrue(calledNext);
  });

  test('RoleMiddleware throws 403 when user lacks role', async ({ assert }) => {
    const user = await User.create({ username: 'regular' });
    const middleware = new RoleMiddleware();
    const ctx = createMockContext(user);

    await assert.rejects(async () => {
      await middleware.handle(
        ctx,
        async () => {
          await Promise.resolve();
        },
        { roles: 'admin' },
      );
    }, /User does not have the right roles/);
  });

  test('PermissionMiddleware allows access when user has permission', async ({ assert }) => {
    const user = await User.create({ username: 'writer' });
    await Permission.findOrCreate({ name: 'publish-posts', guardName: 'web' });
    await user.givePermissionTo('publish-posts');

    const middleware = new PermissionMiddleware();
    const ctx = createMockContext(user);
    let calledNext = false;

    await middleware.handle(
      ctx,
      async () => {
        calledNext = true;
        await Promise.resolve();
      },
      { permissions: 'publish-posts' },
    );

    assert.isTrue(calledNext);
  });

  test('RoleOrPermissionMiddleware allows access with either role or permission', async ({ assert }) => {
    const userWithRole = await User.create({ username: 'u1' });
    await Role.findOrCreate({ name: 'admin', guardName: 'web' });
    await userWithRole.assignRole('admin');

    const userWithPerm = await User.create({ username: 'u2' });
    await Permission.findOrCreate({ name: 'edit-posts', guardName: 'web' });
    await userWithPerm.givePermissionTo('edit-posts');

    const userWithout = await User.create({ username: 'u3' });

    const middleware = new RoleOrPermissionMiddleware();

    let next1 = false;
    await middleware.handle(
      createMockContext(userWithRole),
      async () => {
        next1 = true;
        await Promise.resolve();
      },
      { roleOrPermission: 'admin|edit-posts' },
    );
    assert.isTrue(next1);

    let next2 = false;
    await middleware.handle(
      createMockContext(userWithPerm),
      async () => {
        next2 = true;
        await Promise.resolve();
      },
      { roleOrPermission: 'admin|edit-posts' },
    );
    assert.isTrue(next2);

    await assert.rejects(async () => {
      await middleware.handle(
        createMockContext(userWithout),
        async () => {
          await Promise.resolve();
        },
        { roleOrPermission: 'admin|edit-posts' },
      );
    }, /User does not have any of the necessary access rights/);
  });
});
