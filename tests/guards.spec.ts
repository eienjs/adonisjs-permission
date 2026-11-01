import { test } from '@japa/runner';
import {
  createDatabase,
  createTables,
  Permission,
  Role,
  setupApp,
} from '../tests_helpers/helpers.js';

test.group('Multiple Guards', (group) => {
  group.each.setup(async () => {
    const { app } = await setupApp();
    const db = await createDatabase(app);
    await createTables(db);
  });

  test('roles can exist with same name across different guards', async ({ assert }) => {
    const webAdmin = await Role.findOrCreate({ name: 'admin', guardName: 'web' });
    const apiAdmin = await Role.findOrCreate({ name: 'admin', guardName: 'api' });

    assert.equal(webAdmin.name, 'admin');
    assert.equal(webAdmin.guardName, 'web');
    assert.equal(apiAdmin.name, 'admin');
    assert.equal(apiAdmin.guardName, 'api');
    assert.notEqual(webAdmin.id, apiAdmin.id);

    const foundWeb = await Role.findByName('admin', 'web');
    const foundApi = await Role.findByName('admin', 'api');

    assert.equal(foundWeb.id, webAdmin.id);
    assert.equal(foundApi.id, apiAdmin.id);
  });

  test('permissions can exist with same name across different guards', async ({ assert }) => {
    const webPerm = await Permission.findOrCreate({ name: 'edit-posts', guardName: 'web' });
    const apiPerm = await Permission.findOrCreate({ name: 'edit-posts', guardName: 'api' });

    assert.notEqual(webPerm.id, apiPerm.id);

    const foundWeb = await Permission.findByName('edit-posts', 'web');
    const foundApi = await Permission.findByName('edit-posts', 'api');

    assert.equal(foundWeb.id, webPerm.id);
    assert.equal(foundApi.id, apiPerm.id);
  });
});
