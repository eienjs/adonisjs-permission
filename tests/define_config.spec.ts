import { test } from '@japa/runner';
import defineConfig from '../src/define_config.js';
import { setupApp } from '../tests_helpers/helpers.js';

test.group('defineConfig', () => {
  test('returns default configuration values', async ({ assert }) => {
    const { app } = await setupApp();
    const configProvider = defineConfig({
      models: {
        role: async () => import('../tests_helpers/helpers.js').then((m) => ({ default: m.Role })),
        permission: async () =>
          import('../tests_helpers/helpers.js').then((m) => ({ default: m.Permission })),
      },
    });

    const resolved = await configProvider.resolver(app);

    assert.equal(resolved.defaultGuard, 'web');
    assert.isFalse(resolved.teams);
    assert.equal(resolved.teamForeignKey, 'team_id');
    assert.isFalse(resolved.enableWildcardPermission);
    assert.equal(resolved.wildcardDelimiter, ':');
    assert.isTrue(resolved.cache.enabled);
    assert.equal(resolved.cache.key, 'adonisjs_permission_cache');
    assert.isFalse(resolved.events.enabled);
    assert.isFalse(resolved.superAdmin.enabled);
    assert.equal(resolved.superAdmin.role, 'Super-Admin');
    assert.equal(resolved.tableNames.roles, 'roles');
    assert.equal(resolved.tableNames.permissions, 'permissions');
    assert.deepEqual(resolved.catalog.permissions, []);
    assert.deepEqual(resolved.catalog.roles, {});
  });

  test('merges custom options with defaults', async ({ assert }) => {
    const { app } = await setupApp();
    const configProvider = defineConfig({
      models: {
        role: async () => import('../tests_helpers/helpers.js').then((m) => ({ default: m.Role })),
        permission: async () =>
          import('../tests_helpers/helpers.js').then((m) => ({ default: m.Permission })),
      },
      defaultGuard: 'api',
      teams: true,
      teamForeignKey: 'workspace_id',
      enableWildcardPermission: true,
      superAdmin: { enabled: true, role: 'admin' },
      catalog: {
        permissions: ['posts.create'],
        roles: { admin: ['posts.create'] },
      },
    });

    const resolved = await configProvider.resolver(app);

    assert.equal(resolved.defaultGuard, 'api');
    assert.isTrue(resolved.teams);
    assert.equal(resolved.teamForeignKey, 'workspace_id');
    assert.isTrue(resolved.enableWildcardPermission);
    assert.isTrue(resolved.superAdmin.enabled);
    assert.equal(resolved.superAdmin.role, 'admin');
    assert.deepEqual(resolved.catalog.permissions, ['posts.create']);
    assert.deepEqual(resolved.catalog.roles, { admin: ['posts.create'] });
  });
});
