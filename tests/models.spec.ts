import { test } from '@japa/runner';
import {
  createDatabase,
  createTables,
  Permission,
  Role,
  setupApp,
} from '../tests_helpers/helpers.js';

test.group('Models - Role and Permission', (group) => {
  group.each.setup(async () => {
    const { app } = await setupApp();
    const db = await createDatabase(app);
    await createTables(db);
  });

  test('can create role and find by name and id', async ({ assert }) => {
    const role = await Role.findOrCreate({ name: 'writer', guardName: 'web' });

    assert.equal(role.name, 'writer');
    assert.equal(role.guardName, 'web');

    const foundByName = await Role.findByName('writer', 'web');
    assert.equal(foundByName!.id, role.id);

    const foundById = await Role.findById(role.id);
    assert.equal(foundById!.name, 'writer');
  });

  test('can create permission and find by name and id', async ({ assert }) => {
    const permission = await Permission.findOrCreate({ name: 'edit-posts', guardName: 'web' });

    assert.equal(permission.name, 'edit-posts');
    assert.equal(permission.guardName, 'web');

    const foundByName = await Permission.findByName('edit-posts', 'web');
    assert.equal(foundByName!.id, permission.id);

    const foundById = await Permission.findById(permission.id);
    assert.equal(foundById!.name, 'edit-posts');
  });

  test('throws 404 when role or permission not found', async ({ assert }) => {
    await assert.rejects(
      async () => {
        await Role.findByName('non-existent');
      },
      /There is no role named `non-existent`/,
    );

    await assert.rejects(
      async () => {
        await Permission.findByName('non-existent');
      },
      /There is no permission named `non-existent`/,
    );
  });

  test('roles can give, sync, revoke, and check permissions', async ({ assert }) => {
    const role = await Role.findOrCreate({ name: 'editor', guardName: 'web' });
    await Permission.findOrCreate({ name: 'view-posts', guardName: 'web' });
    const p2 = await Permission.findOrCreate({ name: 'edit-posts', guardName: 'web' });
    const p3 = await Permission.findOrCreate({ name: 'delete-posts', guardName: 'web' });

    // Give permissions
    await role.givePermissionTo('view-posts', p2);
    assert.isTrue(await role.hasPermissionTo('view-posts'));
    assert.isTrue(await role.hasPermissionTo('edit-posts'));
    assert.isFalse(await role.hasPermissionTo('delete-posts'));

    // hasAnyPermission and hasAllPermissions
    assert.isTrue(await role.hasAnyPermission('view-posts', 'delete-posts'));
    assert.isFalse(await role.hasAllPermissions('view-posts', 'delete-posts'));
    assert.isTrue(await role.hasAllPermissions('view-posts', 'edit-posts'));

    // getPermissionNames
    const names = await role.getPermissionNames();
    assert.deepEqual(names.toSorted((a, b) => a.localeCompare(b)), ['edit-posts', 'view-posts']);

    // syncPermissions
    await role.syncPermissions(p3);
    assert.isFalse(await role.hasPermissionTo('view-posts'));
    assert.isFalse(await role.hasPermissionTo('edit-posts'));
    assert.isTrue(await role.hasPermissionTo('delete-posts'));

    // revokePermissionTo
    await role.revokePermissionTo('delete-posts');
    assert.isFalse(await role.hasPermissionTo('delete-posts'));
  });
});
