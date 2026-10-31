import type { ConfigProvider } from '@adonisjs/core/types';
import type { PermissionsConfig, ResolvedPermissionsConfig } from './types.js';
import { configProvider } from '@adonisjs/core';

export function defineConfig(config: PermissionsConfig): ConfigProvider<ResolvedPermissionsConfig> {
  return configProvider.create(async () => {
    return {
      models: {
        role: config.models.role,
        permission: config.models.permission,
      },
      defaultGuard: config.defaultGuard ?? 'web',
      teams: config.teams ?? false,
      teamForeignKey: config.teamForeignKey ?? 'team_id',
      enableWildcardPermission: config.enableWildcardPermission ?? false,
      wildcardDelimiter: config.wildcardDelimiter ?? ':',
      superAdmin: {
        enabled: config.superAdmin?.enabled ?? false,
        role: config.superAdmin?.role ?? 'Super-Admin',
      },
      events: {
        enabled: config.events?.enabled ?? false,
      },
      cache: {
        enabled: config.cache?.enabled ?? true,
        key: config.cache?.key ?? 'adonisjs_permission_cache',
        ttl: config.cache?.ttl ?? '24h',
      },
      catalog: {
        permissions: config.catalog?.permissions ?? [],
        roles: config.catalog?.roles ?? {},
      },
      tableNames: {
        roles: config.tableNames?.roles ?? 'roles',
        permissions: config.tableNames?.permissions ?? 'permissions',
        roleHasPermissions: config.tableNames?.roleHasPermissions ?? 'role_has_permissions',
        modelHasRoles: config.tableNames?.modelHasRoles ?? 'model_has_roles',
        modelHasPermissions: config.tableNames?.modelHasPermissions ?? 'model_has_permissions',
      },
      columnNames: {
        rolePivotKey: config.columnNames?.rolePivotKey ?? 'role_id',
        permissionPivotKey: config.columnNames?.permissionPivotKey ?? 'permission_id',
        modelMorphKey: config.columnNames?.modelMorphKey ?? 'model_id',
        teamForeignKey: config.columnNames?.teamForeignKey ?? 'team_id',
      },
    };
  });
}

export default defineConfig;
