import { randomUUID } from 'node:crypto';
import { compose } from '@adonisjs/core/helpers';
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm';
import { test } from '@japa/runner';
import { CatalogSyncer } from '../src/catalog_syncer.js';
import { HasAuthorizable } from '../src/mixins/has_authorizable.js';
import { Permissible } from '../src/mixins/permissible.js';
import { Roleable } from '../src/mixins/roleable.js';
import { runWithTeam } from '../src/team_manager.js';
import { createDatabase, setupApp } from '../tests_helpers/helpers.js';

const toBigInt = (val: string | number | bigint | null | undefined): bigint | null => {
  if (val === null || val === undefined) {
    return null;
  }

  return BigInt(val);
};

class BigIntRole extends compose(BaseModel, Roleable) {
  public static table = 'roles';

  @column({
    isPrimary: true,
    consume: BigInt,
  })
  public declare id: bigint;

  @column({
    columnName: 'team_id',
    consume: toBigInt,
  })
  public declare teamId: bigint | null;
}

class BigIntPermission extends compose(BaseModel, Permissible) {
  public static table = 'permissions';

  @column({
    isPrimary: true,
    consume: BigInt,
  })
  public declare id: bigint;
}

class BigIntUser extends compose(BaseModel, HasAuthorizable) {
  public static table = 'users';

  @column({
    isPrimary: true,
    consume: BigInt,
  })
  public declare id: bigint;

  @column()
  public declare username: string;
}

class UuidRole extends compose(BaseModel, Roleable) {
  public static table = 'roles';

  public static selfAssignPrimaryKey = true;

  @column({ isPrimary: true })
  public declare id: string;

  @column({ columnName: 'team_id' })
  public declare teamId: string | null;

  @beforeCreate()
  public static assignUuid(model: UuidRole): void {
    model.id ||= randomUUID();
  }
}

class UuidPermission extends compose(BaseModel, Permissible) {
  public static table = 'permissions';

  public static selfAssignPrimaryKey = true;

  @column({ isPrimary: true })
  public declare id: string;

  @beforeCreate()
  public static assignUuid(model: UuidPermission): void {
    model.id ||= randomUUID();
  }
}

class UuidUser extends compose(BaseModel, HasAuthorizable) {
  public static table = 'users';

  public static selfAssignPrimaryKey = true;

  @column({ isPrimary: true })
  public declare id: string;

  @column()
  public declare username: string;

  @beforeCreate()
  public static assignUuid(model: UuidUser): void {
    model.id ||= randomUUID();
  }
}

test.group('Primary Keys Support (bigIncrements & UUID)', () => {
  test('supports bigIncrements (bigint) across Role, Permission, User, Teams, Syncer, and Registrar', async ({
    assert,
  }) => {
    const { app, modelResolver, registrar } = await setupApp({
      teams: true,
      models: {
        role: async () => {
          await Promise.resolve();

          return { default: BigIntRole };
        },
        permission: async () => {
          await Promise.resolve();

          return { default: BigIntPermission };
        },
      },
      morphMap: {
        user: async () => {
          await Promise.resolve();

          return { default: BigIntUser };
        },
      },
      catalog: {
        permissions: ['posts.view', 'posts.edit'],
        roles: {
          editor: ['posts.view', 'posts.edit'],
        },
      },
    });

    modelResolver.setRoleModel(BigIntRole);
    modelResolver.setPermissionModel(BigIntPermission);
    modelResolver.setMorphMap({ user: BigIntUser });

    const db = await createDatabase(app);

    await db.connection().schema.dropTableIfExists('model_has_permissions');
    await db.connection().schema.dropTableIfExists('model_has_roles');
    await db.connection().schema.dropTableIfExists('role_has_permissions');
    await db.connection().schema.dropTableIfExists('permissions');
    await db.connection().schema.dropTableIfExists('roles');
    await db.connection().schema.dropTableIfExists('users');

    await db.connection().schema.createTable('users', (table) => {
      table.bigIncrements('id').primary();
      table.string('username').notNullable();
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('roles', (table) => {
      table.bigIncrements('id').primary();
      table.string('name').notNullable();
      table.string('guard_name').notNullable().defaultTo('web');
      table.bigInteger('team_id').nullable();
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('permissions', (table) => {
      table.bigIncrements('id').primary();
      table.string('name').notNullable();
      table.string('guard_name').notNullable().defaultTo('web');
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('role_has_permissions', (table) => {
      table.bigInteger('permission_id').unsigned().references('id').inTable('permissions').onDelete('CASCADE');
      table.bigInteger('role_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
      table.primary(['permission_id', 'role_id']);
    });

    await db.connection().schema.createTable('model_has_roles', (table) => {
      table.bigInteger('role_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
      table.string('model_type').notNullable();
      table.bigInteger('model_id').unsigned().notNullable();
      table.bigInteger('team_id').nullable();
    });

    await db.connection().schema.createTable('model_has_permissions', (table) => {
      table.bigInteger('permission_id').unsigned().references('id').inTable('permissions').onDelete('CASCADE');
      table.string('model_type').notNullable();
      table.bigInteger('model_id').unsigned().notNullable();
      table.bigInteger('team_id').nullable();
    });

    const teamId = 42n;
    const role = await BigIntRole.findOrCreate({ name: 'admin', teamId });
    const perm = await BigIntPermission.findOrCreate({ name: 'users.manage' });

    assert.equal(typeof role.id, 'bigint');
    assert.equal(typeof perm.id, 'bigint');
    assert.equal(role.teamId, 42n);

    const foundRole = await BigIntRole.findById(role.id, 'web', teamId);
    assert.equal(foundRole.id, role.id);

    const foundPerm = await BigIntPermission.findById(perm.id, 'web');
    assert.equal(foundPerm.id, perm.id);

    await role.givePermissionTo(perm);
    assert.isTrue(await role.hasPermissionTo('users.manage'));

    const user = await BigIntUser.create({ username: 'bigint_user' });
    assert.equal(typeof user.id, 'bigint');

    await user.forTeam(teamId).assignRole(role);
    await user.forTeam(teamId).givePermissionTo('direct.perm');

    assert.isTrue(await user.forTeam(teamId).hasRole('admin'));
    assert.isTrue(await user.forTeam(teamId).can('users.manage'));
    assert.isTrue(await user.forTeam(teamId).can('direct.perm'));

    await runWithTeam(teamId, async () => {
      const freshUser = await BigIntUser.findOrFail(user.id);
      const allPerms = await freshUser.getAllPermissions();
      assert.lengthOf(allPerms, 2);
    });

    const roleUsers = await role.modelsFor(BigIntUser);
    assert.lengthOf(roleUsers, 1);
    assert.equal(roleUsers[0].id, user.id);

    const cached = await registrar.getPermissions();
    const manageEntry = cached.find((c) => c.name === 'users.manage');
    assert.isDefined(manageEntry);
    assert.lengthOf(manageEntry!.roles, 1);
    assert.equal(manageEntry!.roles[0].id, role.id);

    const syncer = new CatalogSyncer(modelResolver.config, modelResolver, registrar);
    const syncResult = await syncer.syncAll({ teamId, prune: false });
    assert.includeMembers(syncResult.permissions.created, ['posts.view', 'posts.edit']);
    assert.includeMembers(syncResult.roles.created, ['editor']);
  });

  test('supports UUID (string) across Role, Permission, User, Teams, Syncer, and Registrar', async ({
    assert,
  }) => {
    const { app, modelResolver, registrar } = await setupApp({
      teams: true,
      models: {
        role: async () => {
          await Promise.resolve();

          return { default: UuidRole };
        },
        permission: async () => {
          await Promise.resolve();

          return { default: UuidPermission };
        },
      },
      morphMap: {
        user: async () => {
          await Promise.resolve();

          return { default: UuidUser };
        },
      },
      catalog: {
        permissions: ['articles.read', 'articles.write'],
        roles: {
          writer: ['articles.read', 'articles.write'],
        },
      },
    });

    modelResolver.setRoleModel(UuidRole);
    modelResolver.setPermissionModel(UuidPermission);
    modelResolver.setMorphMap({ user: UuidUser });

    const db = await createDatabase(app);

    await db.connection().schema.dropTableIfExists('model_has_permissions');
    await db.connection().schema.dropTableIfExists('model_has_roles');
    await db.connection().schema.dropTableIfExists('role_has_permissions');
    await db.connection().schema.dropTableIfExists('permissions');
    await db.connection().schema.dropTableIfExists('roles');
    await db.connection().schema.dropTableIfExists('users');

    await db.connection().schema.createTable('users', (table) => {
      table.uuid('id').primary();
      table.string('username').notNullable();
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('roles', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('guard_name').notNullable().defaultTo('web');
      table.uuid('team_id').nullable();
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('permissions', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('guard_name').notNullable().defaultTo('web');
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('role_has_permissions', (table) => {
      table.uuid('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
      table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
      table.primary(['permission_id', 'role_id']);
    });

    await db.connection().schema.createTable('model_has_roles', (table) => {
      table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
      table.string('model_type').notNullable();
      table.uuid('model_id').notNullable();
      table.uuid('team_id').nullable();
    });

    await db.connection().schema.createTable('model_has_permissions', (table) => {
      table.uuid('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
      table.string('model_type').notNullable();
      table.uuid('model_id').notNullable();
      table.uuid('team_id').nullable();
    });

    const teamUuid = randomUUID();
    const role = await UuidRole.findOrCreate({ name: 'owner', teamId: teamUuid });
    const perm = await UuidPermission.findOrCreate({ name: 'billing.manage' });

    assert.isString(role.id);
    assert.isTrue(role.id.includes('-'));
    assert.isString(perm.id);
    assert.isTrue(perm.id.includes('-'));

    const foundRole = await UuidRole.findById(role.id, 'web', teamUuid);
    assert.equal(foundRole.id, role.id);

    const foundPerm = await UuidPermission.findById(perm.id, 'web');
    assert.equal(foundPerm.id, perm.id);

    await role.givePermissionTo(perm);
    assert.isTrue(await role.hasPermissionTo('billing.manage'));

    const user = await UuidUser.create({ username: 'uuid_user' });
    assert.isString(user.id);
    assert.isTrue(user.id.includes('-'));

    await user.forTeam(teamUuid).assignRole(role);
    await user.forTeam(teamUuid).givePermissionTo('profile.edit');

    assert.isTrue(await user.forTeam(teamUuid).hasRole('owner'));
    assert.isTrue(await user.forTeam(teamUuid).can('billing.manage'));
    assert.isTrue(await user.forTeam(teamUuid).can('profile.edit'));

    const allPerms = await user.forTeam(teamUuid).getAllPermissions();
    assert.lengthOf(allPerms, 2);

    const roleUsers = await role.modelsFor(UuidUser);
    assert.lengthOf(roleUsers, 1);
    assert.equal(roleUsers[0].id, user.id);

    const syncer = new CatalogSyncer(modelResolver.config, modelResolver, registrar);
    const syncResult = await syncer.syncAll({ teamId: teamUuid, prune: false });
    assert.includeMembers(syncResult.permissions.created, ['articles.read', 'articles.write']);
    assert.includeMembers(syncResult.roles.created, ['writer']);

    await user.forTeam(teamUuid).revokeRole(role);
    assert.isFalse(await user.forTeam(teamUuid).hasRole('owner'));
  });

  test('supports mixed primary key types across morph models (number Role/Permission, UUID User, bigint Company)', async ({
    assert,
  }) => {
    class BigIntCompany extends compose(BaseModel, HasAuthorizable) {
      public static table = 'companies';

      @column({
        isPrimary: true,
        consume: BigInt,
      })
      public declare id: bigint;

      @column()
      public declare name: string;
    }

    const { app, modelResolver } = await setupApp({
      morphMap: {
        user: async () => {
          await Promise.resolve();

          return { default: UuidUser };
        },
        company: async () => {
          await Promise.resolve();

          return { default: BigIntCompany };
        },
      },
    });

    modelResolver.setMorphMap({
      user: UuidUser,
      company: BigIntCompany,
    });

    const db = await createDatabase(app);

    await db.connection().schema.dropTableIfExists('model_has_permissions');
    await db.connection().schema.dropTableIfExists('model_has_roles');
    await db.connection().schema.dropTableIfExists('role_has_permissions');
    await db.connection().schema.dropTableIfExists('permissions');
    await db.connection().schema.dropTableIfExists('roles');
    await db.connection().schema.dropTableIfExists('users');
    await db.connection().schema.dropTableIfExists('companies');

    await db.connection().schema.createTable('users', (table) => {
      table.uuid('id').primary();
      table.string('username').notNullable();
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('companies', (table) => {
      table.bigIncrements('id').primary();
      table.string('name').notNullable();
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('roles', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('guard_name').notNullable().defaultTo('web');
      table.string('team_id').nullable();
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('permissions', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('guard_name').notNullable().defaultTo('web');
      table.timestamps(true, true);
    });

    await db.connection().schema.createTable('role_has_permissions', (table) => {
      table.integer('permission_id').unsigned().references('id').inTable('permissions').onDelete('CASCADE');
      table.integer('role_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
      table.primary(['permission_id', 'role_id']);
    });

    await db.connection().schema.createTable('model_has_roles', (table) => {
      table.integer('role_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
      table.string('model_type').notNullable();
      table.string('model_id').notNullable();
      table.string('team_id').nullable();
    });

    await db.connection().schema.createTable('model_has_permissions', (table) => {
      table.integer('permission_id').unsigned().references('id').inTable('permissions').onDelete('CASCADE');
      table.string('model_type').notNullable();
      table.string('model_id').notNullable();
      table.string('team_id').nullable();
    });

    const user = await UuidUser.create({ username: 'mixed_uuid_user' });
    const company = await BigIntCompany.create({ name: 'Mixed BigInt Corp' });

    await user.assignRole('member');
    await user.givePermissionTo('dashboard.access');

    await company.assignRole('enterprise');
    await company.givePermissionTo('invoices.export');

    assert.isTrue(await user.hasRole('member'));
    assert.isFalse(await user.hasRole('enterprise'));
    assert.isTrue(await user.can('dashboard.access'));

    assert.isTrue(await company.hasRole('enterprise'));
    assert.isFalse(await company.hasRole('member'));
    assert.isTrue(await company.can('invoices.export'));
  });
});
