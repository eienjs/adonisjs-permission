import { test } from '@japa/runner';
import { runWithTeam, setPermissionsTeamId } from '../src/team_manager.js';
import {
  createDatabase,
  createTables,
  Permission,
  Role,
  setupApp,
  User,
} from '../tests_helpers/helpers.js';

test.group('Teams Multi-Tenancy', (group) => {
  group.each.setup(async () => {
    const { app } = await setupApp({
      teams: true,
      teamForeignKey: 'team_id',
    });
    const db = await createDatabase(app);
    await createTables(db, { teams: true });
    setPermissionsTeamId(null);
  });

  test('user can have different roles per team with forTeam()', async ({ assert }) => {
    const user = await User.create({ username: 'emma' });
    await Role.findOrCreate({ name: 'admin', guardName: 'web', teamId: 'team-1' });
    await Role.findOrCreate({ name: 'viewer', guardName: 'web', teamId: 'team-2' });

    // Assign roles in different teams
    await user.forTeam('team-1').assignRole('admin');
    await user.forTeam('team-2').assignRole('viewer');

    // Check roles isolated by team
    assert.isTrue(await user.forTeam('team-1').hasRole('admin'));
    assert.isFalse(await user.forTeam('team-1').hasRole('viewer'));

    assert.isTrue(await user.forTeam('team-2').hasRole('viewer'));
    assert.isFalse(await user.forTeam('team-2').hasRole('admin'));

    // Global check without team should not see team roles
    assert.isFalse(await user.forTeam(null).hasRole('admin'));
  });

  test('user permissions are scoped per team via role', async ({ assert }) => {
    const user = await User.create({ username: 'frank' });
    const team1Role = await Role.findOrCreate({ name: 'billing-admin', guardName: 'web', teamId: 'org-a' });
    const team2Role = await Role.findOrCreate({ name: 'viewer', guardName: 'web', teamId: 'org-b' });

    await Permission.findOrCreate({ name: 'manage-invoices', guardName: 'web' });
    await Permission.findOrCreate({ name: 'view-dashboard', guardName: 'web' });

    await team1Role.syncPermissions('manage-invoices', 'view-dashboard');
    await team2Role.syncPermissions('view-dashboard');

    await user.forTeam('org-a').assignRole('billing-admin');
    await user.forTeam('org-b').assignRole('viewer');

    // In org-a
    assert.isTrue(await user.forTeam('org-a').can('manage-invoices'));
    assert.isTrue(await user.forTeam('org-a').can('view-dashboard'));

    // In org-b
    assert.isFalse(await user.forTeam('org-b').can('manage-invoices'));
    assert.isTrue(await user.forTeam('org-b').can('view-dashboard'));
  });

  test('runWithTeam scopes team context via AsyncLocalStorage', async ({ assert }) => {
    const user = await User.create({ username: 'grace' });
    await Role.findOrCreate({ name: 'editor', guardName: 'web', teamId: 'team-x' });

    await runWithTeam('team-x', async () => {
      await user.assignRole('editor');
      assert.isTrue(await user.hasRole('editor'));
    });

    // Outside runWithTeam, user does not have role in default/null team
    assert.isFalse(await user.hasRole('editor'));
  });
});

