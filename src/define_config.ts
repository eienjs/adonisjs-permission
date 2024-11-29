import { configProvider } from '@adonisjs/core';
import { type ConfigProvider } from '@adonisjs/core/types';
import { type PermissionConfig, type ResolvedPermissionConfig } from './types.js';

export const defineConfig = (config: PermissionConfig): ConfigProvider<ResolvedPermissionConfig> => {
  return configProvider.create(async (_) => {
    return {
      models: {
        permission: config.models?.permission ?? (() => import('./models/permission.js')),
        role: config.models?.role ?? (() => import('./models/role.js')),
      },
      tableNames: {
        roles: config.tableNames.roles,
        permissions: config.tableNames.permissions,
        modelHasPermissions: config.tableNames.modelHasPermissions ?? 'model_has_permissions',
        modelHasRoles: config.tableNames.modelHasRoles ?? 'model_has_roles',
        roleHasPermissions: config.tableNames.roleHasPermissions ?? 'role_has_permissions',
      },
      columnNames: {
        rolePivotKey: config.columnNames?.rolePivotKey ?? 'role_id',
        permissionPivotKey: config.columnNames?.permissionPivotKey ?? 'permission_id',
        modelMorphKey: config.columnNames?.modelMorphKey ?? 'model_id',
        teamForeignKey: config.columnNames?.teamForeignKey ?? 'team_id',
      },
      registerPermissionCheckMethod: config.registerPermissionCheckMethod ?? true,
      teams: config.teams ?? false,
      displayPermissionInException: config.displayPermissionInException ?? false,
      displayRoleInException: config.displayRoleInException ?? false,
      enableWildcardPermission: config.enableWildcardPermission ?? false,
      cache: {
        expirationTime: config.cache?.expirationTime ?? '24h',
        key: config.cache?.key ?? 'eienjs:permission',
        store: config.cache?.store ?? 'default',
      },
    };
  });
};
