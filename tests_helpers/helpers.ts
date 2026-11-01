import type { Kernel } from '@adonisjs/core/ace';
import type { ApplicationService } from '@adonisjs/core/types';
import type {
  PermissionModelContract,
  PermissionsConfig,
  RoleModelContract,
} from '../src/types.js';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Emitter } from '@adonisjs/core/events';
import { IgnitorFactory } from '@adonisjs/core/factories';
import { LoggerFactory } from '@adonisjs/core/factories/logger';
import { compose } from '@adonisjs/core/helpers';
import { Database } from '@adonisjs/lucid/database';
import { BaseModel, column } from '@adonisjs/lucid/orm';
import { getActiveTest } from '@japa/runner';
import defineConfig from '../src/define_config.js';
import { HasAuthorizable } from '../src/mixins/has_authorizable.js';
import { HasPermissions } from '../src/mixins/has_permissions.js';
import { HasRoles } from '../src/mixins/has_roles.js';
import { Permissible } from '../src/mixins/permissible.js';
import { Roleable } from '../src/mixins/roleable.js';
import { ModelResolver } from '../src/model_resolver.js';
import { PermissionRegistrar } from '../src/registrar.js';

export const BASE_URL = new URL('tmp/', import.meta.url);

// Define Models for testing
export class Role extends compose(BaseModel, Roleable) {
  @column({ isPrimary: true })
  public declare id: number;
}

export class Permission extends compose(BaseModel, Permissible) {
  @column({ isPrimary: true })
  public declare id: number;
}

export class User extends compose(BaseModel, HasAuthorizable) {
  @column({ isPrimary: true })
  public declare id: number;

  @column()
  public declare username: string;
}

export class Company extends compose(BaseModel, HasAuthorizable) {
  @column({ isPrimary: true })
  public declare id: number;

  @column()
  public declare name: string;
}

export const createDatabase = async (app: ApplicationService, dbName = 'db.sqlite3'): Promise<Database> => {
  const dirPath = path.join(process.cwd(), 'tmp');
  await mkdir(dirPath, { recursive: true });

  const logger = new LoggerFactory().create();
  const emitter = new Emitter(app);
  const db = new Database(
    {
      connection: 'sqlite',
      connections: {
        sqlite: {
          client: 'better-sqlite3',
          connection: { filename: path.join(dirPath, dbName) },
          useNullAsDefault: true,
        },
      },
    },
    logger,
    emitter,
  );

  const activeTest = getActiveTest();
  if (activeTest) {
    activeTest.cleanup(async () => {
      await db.manager.closeAll();
    });
  }

  BaseModel.useAdapter(db.modelAdapter());

  return db;
};

export const createTables = async (
  db: Database,
  options: {
    teams?: boolean;
    rolesTable?: string;
    permissionsTable?: string;
    rolePermissionsTable?: string;
    modelRolesTable?: string;
    modelPermissionsTable?: string;
    usersTable?: string;
  } = {},
): Promise<void> => {
  const rolesTable = options.rolesTable ?? 'roles';
  const permissionsTable = options.permissionsTable ?? 'permissions';
  const rolePermissionsTable = options.rolePermissionsTable ?? 'role_has_permissions';
  const modelRolesTable = options.modelRolesTable ?? 'model_has_roles';
  const modelPermissionsTable = options.modelPermissionsTable ?? 'model_has_permissions';
  const usersTable = options.usersTable ?? 'users';

  const dropAll = async () => {
    await db.connection().schema.dropTableIfExists(modelPermissionsTable);
    await db.connection().schema.dropTableIfExists(modelRolesTable);
    await db.connection().schema.dropTableIfExists(rolePermissionsTable);
    await db.connection().schema.dropTableIfExists(permissionsTable);
    await db.connection().schema.dropTableIfExists(rolesTable);
    await db.connection().schema.dropTableIfExists(usersTable);
    await db.connection().schema.dropTableIfExists('companies');
  };

  const activeTest = getActiveTest();
  if (activeTest) {
    activeTest.cleanup(dropAll);
  }

  await dropAll();

  await db.connection().schema.createTableIfNotExists(usersTable, (table) => {
    table.increments('id').primary();
    table.string('username').nullable();
    table.timestamps(true, true);
  });

  await db.connection().schema.createTableIfNotExists('companies', (table) => {
    table.increments('id').primary();
    table.string('name').nullable();
    table.timestamps(true, true);
  });

  await db.connection().schema.createTableIfNotExists(rolesTable, (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('guard_name').notNullable().defaultTo('web');
    table.string('team_id').nullable();
    table.timestamps(true, true);
  });

  await db.connection().schema.createTableIfNotExists(permissionsTable, (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('guard_name').notNullable().defaultTo('web');
    table.timestamps(true, true);
  });

  await db.connection().schema.createTableIfNotExists(rolePermissionsTable, (table) => {
    table.increments('id').primary();
    table.integer('permission_id').unsigned().references('id').inTable(permissionsTable).onDelete('CASCADE');
    table.integer('role_id').unsigned().references('id').inTable(rolesTable).onDelete('CASCADE');
  });

  await db.connection().schema.createTableIfNotExists(modelRolesTable, (table) => {
    table.integer('role_id').unsigned().references('id').inTable(rolesTable).onDelete('CASCADE');
    table.string('model_type').notNullable();
    table.integer('model_id').unsigned().notNullable();
    table.string('team_id').nullable();
  });

  await db.connection().schema.createTableIfNotExists(modelPermissionsTable, (table) => {
    table.integer('permission_id').unsigned().references('id').inTable(permissionsTable).onDelete('CASCADE');
    table.string('model_type').notNullable();
    table.integer('model_id').unsigned().notNullable();
    table.string('team_id').nullable();
  });
};

export const setupApp = async (
  customConfig?: Partial<PermissionsConfig>,
): Promise<{
  app: ApplicationService;
  ace: Kernel;
  modelResolver: ModelResolver;
  registrar: PermissionRegistrar;
  db: Database;
}> => {
  const permissionsConfig = defineConfig({
    models: {
      role: async () => {
        await Promise.resolve();

        return { default: Role as unknown as RoleModelContract };
      },
      permission: async () => {
        await Promise.resolve();

        return { default: Permission as unknown as PermissionModelContract };
      },
    },
    morphMap: {
      user: async () => {
        await Promise.resolve();

        return { default: User };
      },
      company: async () => {
        await Promise.resolve();

        return { default: Company };
      },
    },
    ...customConfig,
  });

  const ignitor = new IgnitorFactory()
    .merge({ rcFileContents: { providers: [] } })
    .withCoreProviders()
    .withCoreConfig()
    .merge({ config: { permissions: permissionsConfig } })
    .create(BASE_URL, {
      importer: async (filePath) => {
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
          return (await import(new URL(filePath, BASE_URL).href)) as Record<string, unknown>;
        }

        return (await import(filePath)) as Record<string, unknown>;
      },
    });

  const app = ignitor.createApp('web');
  await app.init();
  await app.boot();

  const resolvedConfig = await permissionsConfig.resolver(app);
  const modelResolver = new ModelResolver(resolvedConfig);
  modelResolver.setRoleModel(Role);
  modelResolver.setPermissionModel(Permission);
  modelResolver.setMorphMap({
    user: User,
    company: Company,
  });
  await modelResolver.resolve();
  ModelResolver.setInstance(modelResolver);

  const registrar = new PermissionRegistrar(resolvedConfig, modelResolver);
  PermissionRegistrar.setInstance(registrar);

  app.container.singleton('permission.resolver', () => modelResolver);
  app.container.singleton('permission.registrar', () => registrar);

  const ace = await app.container.make('ace');
  ace.ui.switchMode('raw');

  const db = await createDatabase(app);

  const activeTest = getActiveTest();
  if (activeTest) {
    activeTest.cleanup(async () => {
      await app.terminate();
    });
  }

  return { app, ace, modelResolver, registrar, db };
};

export { HasAuthorizable, HasPermissions, HasRoles, Permissible, Roleable };
