import { test } from '@japa/runner';
import CacheResetCommand from '../commands/cache_reset.js';
import CreatePermissionCommand from '../commands/create_permission.js';
import CreateRoleCommand from '../commands/create_role.js';
import ShowPermissionsCommand from '../commands/show.js';
import SyncPermissionsCommand from '../commands/sync.js';
import {
  createDatabase,
  createTables,
  Permission,
  Role,
  setupApp,
} from '../tests_helpers/helpers.js';

test.group('Ace Commands', (group) => {
  group.each.setup(async () => {
    const { app } = await setupApp({
      catalog: {
        permissions: ['catalog.post.create', 'catalog.post.edit'],
        roles: {
          editor: ['catalog.post.create', 'catalog.post.edit'],
        },
      },
    });
    const db = await createDatabase(app);
    await createTables(db);
  });

  test('permissions:create-permission creates a permission', async ({ assert }) => {
    const { ace } = await setupApp();
    const command = await ace.create(CreatePermissionCommand, ['publish-news', 'web']);
    await command.exec();

    command.assertSucceeded();
    const perm = await Permission.query().where('name', 'publish-news').first();
    assert.isNotNull(perm);
  });

  test('permissions:create-role creates a role with attached permissions', async ({ assert }) => {
    const { ace } = await setupApp();
    const command = await ace.create(CreateRoleCommand, [
      'author',
      'web',
      'write-news,edit-news',
    ]);
    await command.exec();

    command.assertSucceeded();
    const role = (await Role.query().where('name', 'author').preload('permissions' as never).first()) as unknown as { permissions: { name: string }[] } | null;
    assert.isNotNull(role);
    const perms = role!.permissions
      .map((p) => p.name)
      .toSorted((a, b) => a.localeCompare(b));
    assert.deepEqual(perms, ['edit-news', 'write-news']);
  });

  test('permissions:sync synchronizes catalog with database', async ({ assert }) => {
    const { ace } = await setupApp({
      catalog: {
        permissions: ['feature.view', 'feature.manage'],
        roles: {
          admin: ['feature.view', 'feature.manage'],
        },
      },
    });

    const command = await ace.create(SyncPermissionsCommand, ['--force']);
    await command.exec();

    command.assertSucceeded();
    const adminRole = await Role.findByName('admin', 'web');
    assert.isNotNull(adminRole);
    assert.isTrue(await adminRole!.hasPermissionTo('feature.view'));
    assert.isTrue(await adminRole!.hasPermissionTo('feature.manage'));
  });

  test('permissions:cache-reset flushes cache without errors', async () => {
    const { ace } = await setupApp();
    const command = await ace.create(CacheResetCommand, []);
    await command.exec();

    command.assertSucceeded();
  });

  test('permissions:show prints roles and permissions', async () => {
    const { ace } = await setupApp();
    await Role.findOrCreate({ name: 'super', guardName: 'web' });
    await Permission.findOrCreate({ name: 'super-perm', guardName: 'web' });

    const command = await ace.create(ShowPermissionsCommand, []);
    await command.exec();

    command.assertSucceeded();
  });
});
