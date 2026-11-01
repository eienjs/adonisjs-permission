import { test } from '@japa/runner';
import {
  Company,
  createDatabase,
  createTables,
  Permission,
  Role,
  setupApp,
  User,
} from '../tests_helpers/helpers.js';

test.group('Authorizable - User Roles and Permissions', (group) => {
  group.each.setup(async () => {
    const { app } = await setupApp();
    const db = await createDatabase(app);
    await createTables(db);
  });

  test('can assign, check, and revoke roles on user', async ({ assert }) => {
    const user = await User.create({ username: 'alice' });
    await Role.findOrCreate({ name: 'admin', guardName: 'web' });
    await Role.findOrCreate({ name: 'editor', guardName: 'web' });
    await Role.findOrCreate({ name: 'writer', guardName: 'web' });

    // assignRole
    await user.assignRole('admin', 'editor');

    assert.isTrue(await user.hasRole('admin'));
    assert.isTrue(await user.hasRole('editor'));
    assert.isFalse(await user.hasRole('writer'));

    // hasAnyRole
    assert.isTrue(await user.hasAnyRole('writer', 'admin'));
    assert.isFalse(await user.hasAnyRole('writer', 'moderator'));

    // hasAllRoles
    assert.isTrue(await user.hasAllRoles('admin', 'editor'));
    assert.isFalse(await user.hasAllRoles('admin', 'writer'));

    // hasExactRoles
    assert.isTrue(await user.hasExactRoles('editor', 'admin'));
    assert.isFalse(await user.hasExactRoles('admin'));

    // getRoleNames
    const roleNames = await user.getRoleNames();
    assert.deepEqual(roleNames.toSorted((a, b) => a.localeCompare(b)), ['admin', 'editor']);

    // syncRoles
    await user.syncRoles('writer');
    assert.isFalse(await user.hasRole('admin'));
    assert.isTrue(await user.hasRole('writer'));

    // revokeRole
    await user.revokeRole('writer');
    assert.isFalse(await user.hasRole('writer'));
    assert.lengthOf(await user.getRoleNames(), 0);
  });

  test('can assign, check, and revoke direct permissions on user', async ({ assert }) => {
    const user = await User.create({ username: 'bob' });
    await Permission.findOrCreate({ name: 'create-posts', guardName: 'web' });
    await Permission.findOrCreate({ name: 'edit-posts', guardName: 'web' });
    await Permission.findOrCreate({ name: 'delete-posts', guardName: 'web' });

    // givePermissionTo
    await user.givePermissionTo('create-posts', 'edit-posts');

    assert.isTrue(await user.hasDirectPermission('create-posts'));
    assert.isTrue(await user.hasDirectPermission('edit-posts'));
    assert.isFalse(await user.hasDirectPermission('delete-posts'));

    const direct = await user.getDirectPermissions();
    assert.lengthOf(direct, 2);

    // syncPermissions
    await user.syncPermissions('delete-posts');
    assert.isFalse(await user.hasDirectPermission('create-posts'));
    assert.isTrue(await user.hasDirectPermission('delete-posts'));

    // revokePermissionTo
    await user.revokePermissionTo('delete-posts');
    assert.isFalse(await user.hasDirectPermission('delete-posts'));
  });

  test('can check permissions via roles and combined permissions', async ({ assert }) => {
    const user = await User.create({ username: 'carol' });
    const managerRole = await Role.findOrCreate({ name: 'manager', guardName: 'web' });
    await Permission.findOrCreate({ name: 'approve-budget', guardName: 'web' });
    await Permission.findOrCreate({ name: 'view-reports', guardName: 'web' });
    await Permission.findOrCreate({ name: 'submit-timesheet', guardName: 'web' });

    await managerRole.syncPermissions('approve-budget', 'view-reports');
    await user.assignRole('manager');
    await user.givePermissionTo('submit-timesheet');

    // hasPermissionViaRole
    assert.isTrue(await user.hasPermissionViaRole('approve-budget'));
    assert.isTrue(await user.hasPermissionViaRole('view-reports'));
    assert.isFalse(await user.hasPermissionViaRole('submit-timesheet'));

    // getAllPermissions
    const all = await user.getAllPermissions();
    const allNames = all
      .map((p) => (p as unknown as { name: string }).name)
      .toSorted((a, b) => a.localeCompare(b));
    assert.deepEqual(allNames, ['approve-budget', 'submit-timesheet', 'view-reports']);

    // can and cannot
    assert.isTrue(await user.can('approve-budget'));
    assert.isTrue(await user.can('submit-timesheet'));
    assert.isFalse(await user.can('delete-all-data'));

    assert.isFalse(await user.cannot('approve-budget'));
    assert.isTrue(await user.cannot('delete-all-data'));

    // checkPermissionTo throws when unauthorized
    assert.isTrue(await user.checkPermissionTo('approve-budget'));
    await assert.rejects(
      async () => {
        await user.checkPermissionTo('unauthorized-perm');
      },
      /User does not have the right permissions/,
    );
  });

  test('polymorphic pivot tables isolate roles and permissions across different models with morphMap', async ({ assert }) => {
    const user = await User.create({ username: 'dave' });
    const company = await Company.create({ name: 'Acme Corp' });

    // Both have id = 1 in their respective tables
    assert.equal(user.id, company.id);

    const adminRole = await Role.findOrCreate({ name: 'admin', guardName: 'web' });
    const partnerRole = await Role.findOrCreate({ name: 'partner', guardName: 'web' });
    const billingPerm = await Permission.findOrCreate({ name: 'manage-billing', guardName: 'web' });
    const apiPerm = await Permission.findOrCreate({ name: 'use-api', guardName: 'web' });

    await user.assignRole('admin');
    await user.givePermissionTo('manage-billing');

    await company.assignRole('partner');
    await company.givePermissionTo('use-api');

    // User has admin & manage-billing, NOT partner or use-api
    assert.isTrue(await user.hasRole('admin'));
    assert.isFalse(await user.hasRole('partner'));
    assert.isTrue(await user.hasDirectPermission('manage-billing'));
    assert.isFalse(await user.hasDirectPermission('use-api'));

    // Company has partner & use-api, NOT admin or manage-billing
    assert.isTrue(await company.hasRole('partner'));
    assert.isFalse(await company.hasRole('admin'));
    assert.isTrue(await company.hasDirectPermission('use-api'));
    assert.isFalse(await company.hasDirectPermission('manage-billing'));

    // Resolve models from Role and Permission using morphMap alias or class
    const adminUsers = await adminRole.modelsFor<typeof User>('user');
    const adminCompanies = await adminRole.modelsFor<typeof Company>('company');
    assert.lengthOf(adminUsers, 1);
    assert.equal(adminUsers[0].username, 'dave');
    assert.lengthOf(adminCompanies, 0);

    const partnerCompanies = await partnerRole.modelsFor(Company);
    assert.lengthOf(partnerCompanies, 1);
    assert.equal(partnerCompanies[0].name, 'Acme Corp');

    const billingUsers = await billingPerm.modelsFor<typeof User>('user');
    const apiCompanies = await apiPerm.modelsFor<typeof Company>('company');
    assert.lengthOf(billingUsers, 1);
    assert.equal(billingUsers[0].username, 'dave');
    assert.lengthOf(apiCompanies, 1);
    assert.equal(apiCompanies[0].name, 'Acme Corp');

    // Syncing or revoking on User does not affect Company with same id
    await user.revokeRole('admin');
    await user.revokePermissionTo('manage-billing');
    assert.isTrue(await company.hasRole('partner'));
    assert.isTrue(await company.hasDirectPermission('use-api'));
  });
});
