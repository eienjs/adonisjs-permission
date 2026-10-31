import { test } from '@japa/runner';
import {
  createDatabase,
  createTables,
  Role,
  setupApp,
  User,
} from '../tests_helpers/helpers.js';

test.group('Super-Admin Bypass', () => {
  test('user with super-admin role bypasses all permission checks', async ({ assert }) => {
    const { app } = await setupApp({
      superAdmin: {
        enabled: true,
        role: 'Super-Admin',
      },
    });
    const db = await createDatabase(app);
    await createTables(db);

    await Role.findOrCreate({ name: 'Super-Admin', guardName: 'web' });

    const superUser = await User.create({ username: 'root' });
    await superUser.assignRole('Super-Admin');

    const regularUser = await User.create({ username: 'norm' });

    // SuperUser has any arbitrary permission
    assert.isTrue(await superUser.can('destroy-universe'));
    assert.isTrue(await superUser.can('delete-production-db'));
    assert.isTrue(await superUser.hasPermissionTo('anything'));

    // RegularUser does not
    assert.isFalse(await regularUser.can('destroy-universe'));
  });

  test('super-admin bypass disabled by default', async ({ assert }) => {
    const { app } = await setupApp();
    const db = await createDatabase(app);
    await createTables(db);

    await Role.findOrCreate({ name: 'Super-Admin', guardName: 'web' });
    const user = await User.create({ username: 'admin' });
    await user.assignRole('Super-Admin');

    // Without superAdmin.enabled, the user does not bypass
    assert.isFalse(await user.can('undeclared-permission'));
  });
});
