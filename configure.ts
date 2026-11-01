import type ConfigureCommand from '@adonisjs/core/commands/configure';
import { stubsRoot } from './stubs/main.js';

export async function configure(command: ConfigureCommand): Promise<void> {
  const { defaults, migrations, middlewares, models, teams, wildcard } = command.parsedFlags as {
    defaults?: boolean;
    migrations?: boolean;
    middlewares?: boolean;
    models?: boolean;
    teams?: boolean;
    wildcard?: boolean;
  };

  let shouldCreateMigrations = migrations;
  let shouldInstallMiddlewares = middlewares;
  let shouldCreateModels = models;
  let shouldEnableTeams = teams;
  let shouldEnableWildcard = wildcard;

  const config = {
    defaultGuard: 'web',
    teams: false,
    teamForeignKey: 'team_id',
    teamProperty: 'teamId',
    enableWildcardPermission: false,
    rolesTable: 'roles',
    permissionsTable: 'permissions',
    roleHasPermissionsTable: 'role_has_permissions',
    modelHasRolesTable: 'model_has_roles',
    modelHasPermissionsTable: 'model_has_permissions',
    rolePivotKey: 'role_id',
    permissionPivotKey: 'permission_id',
    modelMorphKey: 'model_id',
    modelMorphType: 'model_type',
  };

  if (!defaults) {
    shouldEnableTeams ??= await command.prompt.confirm(
      'Do you want to enable Teams / Multi-tenancy permissions?',
      { default: false },
    );

    shouldEnableWildcard ??= await command.prompt.confirm(
      'Do you want to enable Apache Shiro style wildcard permissions (e.g. posts.*)?',
      { default: false },
    );

    shouldCreateModels ??= await command.prompt.confirm(
      'Do you want to scaffold Role and Permission Lucid models?',
      { default: true },
    );

    shouldCreateMigrations ??= await command.prompt.confirm(
      'Do you want to create migration files?',
      { default: true },
    );

    shouldInstallMiddlewares ??= await command.prompt.confirm(
      'Do you want to register route middlewares (role, permission, roleOrPermission)?',
      { default: true },
    );
  }

  config.teams = Boolean(shouldEnableTeams);
  config.enableWildcardPermission = Boolean(shouldEnableWildcard);

  const codemods = await command.createCodemods();

  /**
  1. Publish Provider and Commands to .adonisrc.ts
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('@eienjs/adonisjs-permission/commands');
    rcFile.addProvider('@eienjs/adonisjs-permission/permissions_provider');
  });

  /**
  2. Publish Role and Permission models
   */
  if (shouldCreateModels !== false) {
    await codemods.makeUsingStub(stubsRoot, 'models/role.stub', {
      teams: config.teams,
      teamForeignKey: config.teamForeignKey,
      teamProperty: config.teamProperty,
    });

    await codemods.makeUsingStub(stubsRoot, 'models/permission.stub', {});
  }

  /**
  3. Publish config file
   */
  await codemods.makeUsingStub(stubsRoot, 'config.stub', { config });

  /**
  4. Publish migrations
   */
  if (shouldCreateMigrations !== false) {
    const now = Date.now();

    await codemods.makeUsingStub(stubsRoot, 'migrations/roles.stub', {
      migration: {
        tableName: config.rolesTable,
        fileName: `${now}_create_${config.rolesTable}_table.ts`,
      },
      teams: config.teams,
      teamForeignKey: config.teamForeignKey,
    });

    await codemods.makeUsingStub(stubsRoot, 'migrations/permissions.stub', {
      migration: {
        tableName: config.permissionsTable,
        fileName: `${now + 1}_create_${config.permissionsTable}_table.ts`,
      },
    });

    await codemods.makeUsingStub(stubsRoot, 'migrations/role_has_permissions.stub', {
      migration: {
        tableName: config.roleHasPermissionsTable,
        fileName: `${now + 2}_create_${config.roleHasPermissionsTable}_table.ts`,
      },
      rolesTable: config.rolesTable,
      permissionsTable: config.permissionsTable,
      rolePivotKey: config.rolePivotKey,
      permissionPivotKey: config.permissionPivotKey,
    });

    await codemods.makeUsingStub(stubsRoot, 'migrations/model_has_roles.stub', {
      migration: {
        tableName: config.modelHasRolesTable,
        fileName: `${now + 3}_create_${config.modelHasRolesTable}_table.ts`,
      },
      rolesTable: config.rolesTable,
      rolePivotKey: config.rolePivotKey,
      modelMorphKey: config.modelMorphKey,
      modelMorphType: config.modelMorphType,
      teams: config.teams,
      teamForeignKey: config.teamForeignKey,
    });

    await codemods.makeUsingStub(stubsRoot, 'migrations/model_has_permissions.stub', {
      migration: {
        tableName: config.modelHasPermissionsTable,
        fileName: `${now + 4}_create_${config.modelHasPermissionsTable}_table.ts`,
      },
      permissionsTable: config.permissionsTable,
      permissionPivotKey: config.permissionPivotKey,
      modelMorphKey: config.modelMorphKey,
      modelMorphType: config.modelMorphType,
      teams: config.teams,
      teamForeignKey: config.teamForeignKey,
    });
  }

  /**
  5. Register Middlewares
   */
  if (shouldInstallMiddlewares !== false) {
    await codemods.registerMiddleware('named', [
      {
        name: 'role',
        path: '@eienjs/adonisjs-permission/role_middleware',
      },
      {
        name: 'permission',
        path: '@eienjs/adonisjs-permission/permission_middleware',
      },
      {
        name: 'roleOrPermission',
        path: '@eienjs/adonisjs-permission/role_or_permission_middleware',
      },
    ]);
  }
}

export default configure;
