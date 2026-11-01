import { test } from '@japa/runner';
import { CatalogSyncer } from '../src/catalog_syncer.js';
import {
  createDatabase,
  createTables,
  Permission,
  Role,
  setupApp,
  User,
} from '../tests_helpers/helpers.js';

test.group('Catalog Syncer', () => {
  test('inspect identifies missing and obsolete roles and permissions', async ({ assert }) => {
    const { modelResolver, registrar, app } = await setupApp({
      catalog: {
        permissions: ['catalog.perm.1', 'catalog.perm.2'],
        roles: {
          manager: ['catalog.perm.1'],
          editor: ['catalog.perm.2'],
        },
      },
    });
    const db = await createDatabase(app);
    await createTables(db);

    // Create an obsolete role and permission in DB
    await Role.findOrCreate({ name: 'obsolete-role', guardName: 'web' });
    await Permission.findOrCreate({ name: 'obsolete-perm', guardName: 'web' });

    const syncer = new CatalogSyncer(modelResolver.config, modelResolver, registrar);
    const inspection = await syncer.inspect();

    assert.isTrue(inspection.missingPermissions.includes('catalog.perm.1'));
    assert.isTrue(inspection.missingPermissions.includes('catalog.perm.2'));
    assert.isTrue(inspection.missingRoles.includes('manager'));
    assert.isTrue(inspection.missingRoles.includes('editor'));

    const obsoleteRole = inspection.obsoleteRoles.find((r) => r.name === 'obsolete-role');
    assert.isDefined(obsoleteRole);
    assert.equal(obsoleteRole?.assignedCount, 0);

    const obsoletePerm = inspection.obsoletePermissions.find((p) => p.name === 'obsolete-perm');
    assert.isDefined(obsoletePerm);
    assert.equal(obsoletePerm?.assignedCount, 0);
  });

  test('safety check detects assignments and halts pruning without confirmation', async ({ assert }) => {
    const { modelResolver, registrar, app } = await setupApp({
      catalog: {
        permissions: ['new.perm'],
        roles: {
          'new-role': ['new.perm'],
        },
      },
    });
    const db = await createDatabase(app);
    await createTables(db);

    // Create obsolete role and permission and assign them to a user
    await Role.findOrCreate({ name: 'old-role', guardName: 'web' });
    await Permission.findOrCreate({ name: 'old-perm', guardName: 'web' });
    const user = await User.create({ username: 'user1' });

    await user.assignRole('old-role');
    await user.givePermissionTo('old-perm');

    const syncer = new CatalogSyncer(modelResolver.config, modelResolver, registrar);
    const inspection = await syncer.inspect();

    const obsoleteRole = inspection.obsoleteRoles.find((r) => r.name === 'old-role');
    assert.equal(obsoleteRole?.assignedCount, 1);

    const obsoletePerm = inspection.obsoletePermissions.find((p) => p.name === 'old-perm');
    assert.isTrue((obsoletePerm?.assignedCount ?? 0) >= 1);

    // Sync with confirmHandler returning false (user refused pruning assigned roles)
    let confirmCalledWith: unknown = null;
    const result = await syncer.syncAll({
      prune: true,
      force: false,
      confirmHandler: async (items) => {
        confirmCalledWith = items;
        await Promise.resolve();

        return false;
      },
    });

    assert.isNotNull(confirmCalledWith);
    // Preserved because user refused
    assert.isTrue(result.roles.preserved.includes('old-role'));
    assert.isTrue(result.permissions.preserved.includes('old-perm'));

    // Old role and perm must still exist in DB
    const foundOldRole = await Role.query().where('name', 'old-role').first();
    const foundOldPerm = await Permission.query().where('name', 'old-perm').first();
    assert.isNotNull(foundOldRole);
    assert.isNotNull(foundOldPerm);
  });

  test('syncAll creates missing, syncs role permissions, and prunes with confirmation or force', async ({
    assert,
  }) => {
    const { modelResolver, registrar, app } = await setupApp({
      catalog: {
        permissions: ['posts.create', 'posts.edit'],
        roles: {
          author: ['posts.create', 'posts.edit'],
        },
      },
    });
    const db = await createDatabase(app);
    await createTables(db);

    // Obsolete items with no assignments
    await Role.findOrCreate({ name: 'stale-role', guardName: 'web' });
    await Permission.findOrCreate({ name: 'stale-perm', guardName: 'web' });

    const syncer = new CatalogSyncer(modelResolver.config, modelResolver, registrar);
    const result = await syncer.syncAll({ prune: true });

    assert.isTrue(result.permissions.created.includes('posts.create'));
    assert.isTrue(result.permissions.created.includes('posts.edit'));
    assert.isTrue(result.permissions.pruned.includes('stale-perm'));

    assert.isTrue(result.roles.created.includes('author'));
    assert.isTrue(result.roles.pruned.includes('stale-role'));
    assert.deepEqual(result.roles.synced.author, ['posts.create', 'posts.edit']);

    // Check author role has both permissions attached
    const authorRole = await Role.findByName('author', 'web');
    assert.isNotNull(authorRole);
    assert.isTrue(await authorRole.hasPermissionTo('posts.create'));
    assert.isTrue(await authorRole.hasPermissionTo('posts.edit'));
  });
});
