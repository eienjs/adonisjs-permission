import { test } from '@japa/runner';
import { WildcardPermission } from '../src/wildcard.js';
import {
  createDatabase,
  createTables,
  Permission,
  setupApp,
  User,
} from '../tests_helpers/helpers.js';

test.group('Wildcard Permissions', () => {
  test('WildcardPermission.implies logic', ({ assert }) => {
    // Star matches everything
    assert.isTrue(WildcardPermission.implies('*', 'anything'));
    assert.isTrue(WildcardPermission.implies('*', 'posts.edit'));

    // Exact matches
    assert.isTrue(WildcardPermission.implies('posts.edit', 'posts.edit'));
    assert.isFalse(WildcardPermission.implies('posts.edit', 'posts.delete'));

    // Wildcard prefix
    assert.isTrue(WildcardPermission.implies('posts.*', 'posts.edit'));
    assert.isTrue(WildcardPermission.implies('posts.*', 'posts.delete'));
    assert.isFalse(WildcardPermission.implies('posts.*', 'users.edit'));

    // Multi-action comma lists
    assert.isTrue(WildcardPermission.implies('posts.view,edit', 'posts.view'));
    assert.isTrue(WildcardPermission.implies('posts.view,edit', 'posts.edit'));
    assert.isFalse(WildcardPermission.implies('posts.view,edit', 'posts.delete'));

    // Multi-segment wildcards
    assert.isTrue(WildcardPermission.implies('reports.*.export', 'reports.financial.export'));
    assert.isFalse(WildcardPermission.implies('reports.*.export', 'reports.financial.view'));

    // In Shiro/Spatie, general permission implies specific sub-action: 'posts' implies 'posts.edit'
    assert.isTrue(WildcardPermission.implies('posts', 'posts.edit'));
    assert.isFalse(WildcardPermission.implies('posts.edit', 'posts'));
    assert.isTrue(WildcardPermission.implies('posts.*', 'posts.edit.sub'));
  });

  test('user evaluation with wildcard permission enabled in config', async ({ assert }) => {
    const { app } = await setupApp({
      enableWildcardPermission: true,
    });
    const db = await createDatabase(app);
    await createTables(db);

    const user = await User.create({ username: 'dave' });
    await Permission.findOrCreate({ name: 'posts.*', guardName: 'web' });
    await Permission.findOrCreate({ name: 'billing.view,download', guardName: 'web' });

    await user.givePermissionTo('posts.*', 'billing.view,download');

    // Posts wildcard
    assert.isTrue(await user.can('posts.create'));
    assert.isTrue(await user.can('posts.update'));
    assert.isTrue(await user.can('posts.delete'));
    assert.isFalse(await user.can('users.create'));

    // Billing multi-action list
    assert.isTrue(await user.can('billing.view'));
    assert.isTrue(await user.can('billing.download'));
    assert.isFalse(await user.can('billing.delete'));
  });
});
