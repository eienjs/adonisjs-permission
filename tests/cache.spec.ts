import { test } from '@japa/runner';
import {
  createDatabase,
  createTables,
  Permission,
  Role,
  setupApp,
} from '../tests_helpers/helpers.js';

test.group('Permission Registrar & Cache', () => {
  test('caches permissions in memory and invalidates on modification', async ({ assert }) => {
    const { app, registrar } = await setupApp({
      cache: {
        enabled: true,
        ttl: '1h',
      },
    });
    const db = await createDatabase(app);
    await createTables(db);

    await Permission.findOrCreate({ name: 'edit-articles', guardName: 'web' });

    // Initial load populates cache
    const first = await registrar.getPermissions();
    assert.lengthOf(first, 1);
    assert.equal(first[0].name, 'edit-articles');

    // Create a new permission in DB directly without clearing cache
    await Permission.findOrCreate({ name: 'delete-articles', guardName: 'web' });

    // Registrar should still return cached result (1 perm)
    const second = await registrar.getPermissions();
    assert.lengthOf(second, 1);

    // Explicit cache forget
    registrar.forgetCachedPermissions();

    // Now it refreshes from DB
    const third = await registrar.getPermissions();
    assert.lengthOf(third, 2);

    // Modifying via roleable mixin auto-clears registrar cache
    const role = await Role.findOrCreate({ name: 'writer', guardName: 'web' });
    await role.givePermissionTo('edit-articles');

    const fourth = await registrar.getPermissions();
    const editPerm = fourth.find((p) => p.name === 'edit-articles');
    assert.isDefined(editPerm);
    assert.isTrue(editPerm?.roles.some((r) => r.name === 'writer'));
  });
});
