import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model';
import type { ManyToMany } from '@adonisjs/lucid/types/relations';

/**
 * Supported primary key types for models, teams, and pivots.
 */
export type PrimaryKeyType = string | number | bigint;

/**
 * Dynamic loaders for Role and Permission models.
 */
export interface PermissionsModelsConfig {
  role: () => Promise<{ default: LucidModel }>;
  permission: () => Promise<{ default: LucidModel }>;
}

/**
 * Morph map alias loaders for polymorphic models.
 */
export type PermissionsMorphMapConfig = Record<string, () => Promise<{ default: LucidModel }>>;

/**
 * Catalog definition for roles and permissions synchronization.
 */
export interface PermissionsCatalogConfig {
  permissions?: string[];
  roles?: Record<string, string[]>;
}

/**
 * Custom table names configuration.
 */
export interface PermissionsTableNames {
  roles: string;
  permissions: string;
  roleHasPermissions: string;
  modelHasRoles: string;
  modelHasPermissions: string;
}

/**
 * Custom column names configuration.
 */
export interface PermissionsColumnNames {
  rolePivotKey: string;
  permissionPivotKey: string;
  modelMorphKey: string;
  modelMorphType: string;
  teamForeignKey: string;
}

/**
 * Memory cache configuration.
 */
export interface PermissionsCacheConfig {
  enabled?: boolean;
  key?: string;
  ttl?: string | number;
}

/**
 * Events configuration.
 */
export interface PermissionsEventsConfig {
  enabled?: boolean;
}

/**
 * Super-Admin configuration.
 */
export interface PermissionsSuperAdminConfig {
  enabled?: boolean;
  role?: string;
}

/**
 * Full user configuration for adonisjs-permission.
 */
export interface PermissionsConfig {
  models: PermissionsModelsConfig;
  morphMap?: PermissionsMorphMapConfig;
  defaultGuard?: string;
  teams?: boolean;
  teamForeignKey?: string;
  enableWildcardPermission?: boolean;
  wildcardDelimiter?: string;
  superAdmin?: PermissionsSuperAdminConfig;
  events?: PermissionsEventsConfig;
  cache?: PermissionsCacheConfig;
  catalog?: PermissionsCatalogConfig;
  tableNames?: Partial<PermissionsTableNames>;
  columnNames?: Partial<PermissionsColumnNames>;
}

/**
 * Methods provided by HasPermissions mixin.
 */
export interface HasPermissionsMethods {
  givePermissionTo: (...permissions: (string | LucidRow)[]) => Promise<void>;
  syncPermissions: (...permissions: (string | LucidRow)[]) => Promise<void>;
  revokePermissionTo: (...permissions: (string | LucidRow)[]) => Promise<void>;
  hasDirectPermission: (permission: string | LucidRow) => Promise<boolean>;
  hasPermissionTo: (permission: string | LucidRow, guardName?: string) => Promise<boolean>;
  hasAnyPermission: (...permissions: (string | LucidRow)[]) => Promise<boolean>;
  hasAllPermissions: (...permissions: (string | LucidRow)[]) => Promise<boolean>;
  getDirectPermissions: () => Promise<LucidRow[]>;
  getPermissionNames: () => Promise<string[]>;
}

/**
 * HasPermissions mixin interface.
 */
export interface HasPermissionsMixin extends HasPermissionsMethods, LucidRow {
  permissions: ManyToMany<LucidModel>;
}

/**
 * Methods provided by HasRoles mixin.
 */
export interface HasRolesMethods {
  assignRole: (...roles: (string | LucidRow)[]) => Promise<void>;
  revokeRole: (...roles: (string | LucidRow)[]) => Promise<void>;
  syncRoles: (...roles: (string | LucidRow)[]) => Promise<void>;
  hasRole: (role: string | LucidRow | (string | LucidRow)[], guardName?: string) => Promise<boolean>;
  hasAnyRole: (...roles: (string | LucidRow)[]) => Promise<boolean>;
  hasAllRoles: (...roles: (string | LucidRow)[]) => Promise<boolean>;
  hasExactRoles: (...roles: (string | LucidRow)[]) => Promise<boolean>;
  getRoleNames: () => Promise<string[]>;
}

/**
 * HasRoles mixin interface.
 */
export interface HasRolesMixin extends HasRolesMethods, LucidRow {
  roles: ManyToMany<LucidModel>;
}

/**
 * Roleable mixin interface for Role models.
 */
export interface RoleableMixin extends HasPermissionsMixin {
  modelsFor: <T extends LucidModel = LucidModel>(
    modelOrMorphType: string | T,
  ) => Promise<InstanceType<T>[]>;
}

/**
 * Permissible mixin interface for Permission models.
 */
export interface PermissibleMixin extends LucidRow {
  roles: ManyToMany<LucidModel>;
  modelsFor: <T extends LucidModel = LucidModel>(
    modelOrMorphType: string | T,
  ) => Promise<InstanceType<T>[]>;
}

/**
 * Methods provided by HasAuthorizable mixin.
 */
export interface HasAuthorizableMethods {
  hasPermissionViaRole: (permission: string | LucidRow) => Promise<boolean>;
  getPermissionsViaRoles: () => Promise<LucidRow[]>;
  getAllPermissions: () => Promise<LucidRow[]>;
  hasPermissionTo: (permission: string | LucidRow, guardName?: string) => Promise<boolean>;
  checkPermissionTo: (permission: string | LucidRow, guardName?: string) => Promise<boolean>;
  hasAnyPermission: (...permissions: (string | LucidRow)[]) => Promise<boolean>;
  hasAllPermissions: (...permissions: (string | LucidRow)[]) => Promise<boolean>;
  can: (permission: string | LucidRow) => Promise<boolean>;
  cannot: (permission: string | LucidRow) => Promise<boolean>;
  forTeam: (teamId: PrimaryKeyType | null) => this;
}

/**
 * HasAuthorizable mixin interface combining roles, permissions, and authorizable capabilities.
 */
export interface HasAuthorizableMixin
  extends HasAuthorizableMethods,
  HasRolesMixin,
  HasPermissionsMixin {}

/**
 * An instantiated Role model row.
 */
export type RoleInstance = LucidRow & RoleableMixin & {
  id: PrimaryKeyType;
  name: string;
  guardName?: string;
  teamId?: PrimaryKeyType | null;
};

/**
 * An instantiated Permission model row.
 */
export type PermissionInstance = LucidRow & PermissibleMixin & {
  id: PrimaryKeyType;
  name: string;
  guardName?: string;
};

/**
 * Static contract for Role model.
 */
export type RoleModelContract = LucidModel & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): RoleInstance;
  findByName: <T extends LucidModel = RoleModelContract>(
    this: T,
    name: string,
    guardName?: string,
    teamId?: PrimaryKeyType | null,
  ) => Promise<InstanceType<T>>;
  findById: <T extends LucidModel = RoleModelContract>(
    this: T,
    id: PrimaryKeyType,
    guardName?: string,
    teamId?: PrimaryKeyType | null,
  ) => Promise<InstanceType<T>>;
  findOrCreate: <T extends LucidModel = RoleModelContract>(
    this: T,
    attributes: {
      name: string;
      guardName?: string;
      teamId?: PrimaryKeyType | null;
      [key: string]: unknown;
    },
  ) => Promise<InstanceType<T>>;
};

/**
 * Static contract for Permission model.
 */
export type PermissionModelContract = LucidModel & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): PermissionInstance;
  findByName: <T extends LucidModel = PermissionModelContract>(
    this: T,
    name: string,
    guardName?: string,
  ) => Promise<InstanceType<T>>;
  findById: <T extends LucidModel = PermissionModelContract>(
    this: T,
    id: PrimaryKeyType,
    guardName?: string,
  ) => Promise<InstanceType<T>>;
  findOrCreate: <T extends LucidModel = PermissionModelContract>(
    this: T,
    attributes: { name: string; guardName?: string; [key: string]: unknown },
  ) => Promise<InstanceType<T>>;
};

/**
 * Syncer inspection report.
 */
export interface CatalogInspectionResult {
  missingPermissions: string[];
  obsoletePermissions: { id: PrimaryKeyType; name: string; assignedCount: number }[];
  missingRoles: string[];
  obsoleteRoles: { id: PrimaryKeyType; name: string; assignedCount: number }[];
  rolesWithPermissionChanges: { role: string; toAttach: string[]; toDetach: string[] }[];
}

/**
 * Syncer execution result.
 */
export interface SyncResult {
  permissions: { created: string[]; pruned: string[]; preserved: string[] };
  roles: { created: string[]; pruned: string[]; preserved: string[]; synced: Record<string, string[]> };
}

/**
 * HTTP Middleware options.
 */
export interface RoleMiddlewareOptions {
  roles: string | string[];
  guard?: string;
}

export interface PermissionMiddlewareOptions {
  permissions: string | string[];
  guard?: string;
}

export interface RoleOrPermissionMiddlewareOptions {
  roleOrPermission: string | string[];
  guard?: string;
}
