import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model';
import type { ManyToMany } from '@adonisjs/lucid/types/relations';

export type NoConstructor<T> = Omit<T, 'constructor'>;

export type PrimaryKeyType = string | number | bigint;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModelConstructor<T> = new (...args: any[]) => T;

export interface PermissionsModelsConfig {
  role: () => Promise<{ default: LucidModel }>;
  permission: () => Promise<{ default: LucidModel }>;
}

export type PermissionsMorphMapConfig = Record<string, () => Promise<{ default: LucidModel }>>;

export interface PermissionsCatalogConfig {
  permissions?: string[];
  roles?: Record<string, string[]>;
}

export interface PermissionsTableNames {
  roles: string;
  permissions: string;
  roleHasPermissions: string;
  modelHasRoles: string;
  modelHasPermissions: string;
}

export interface PermissionsColumnNames {
  rolePivotKey: string;
  permissionPivotKey: string;
  modelMorphKey: string;
  modelMorphType: string;
  teamForeignKey: string;
}

export interface PermissionsCacheConfig {
  enabled?: boolean;
  key?: string;
  ttl?: string | number;
}

export interface PermissionsEventsConfig {
  enabled?: boolean;
}

export interface PermissionsSuperAdminConfig {
  enabled?: boolean;
  role?: string;
}

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

export interface ResolvedPermissionsConfig {
  models: PermissionsModelsConfig;
  morphMap: PermissionsMorphMapConfig;
  defaultGuard: string;
  teams: boolean;
  teamForeignKey: string;
  enableWildcardPermission: boolean;
  wildcardDelimiter: string;
  superAdmin: Required<PermissionsSuperAdminConfig>;
  events: Required<PermissionsEventsConfig>;
  cache: Required<PermissionsCacheConfig>;
  catalog: Required<PermissionsCatalogConfig>;
  tableNames: PermissionsTableNames;
  columnNames: PermissionsColumnNames;
}

export interface AuthorizableConfig {
  rolesPivotTable?: string;
  permissionsPivotTable?: string;
  rolePivotKey?: string;
  permissionPivotKey?: string;
  modelMorphKey?: string;
  teamForeignKey?: string;
  guardName?: string;
}

export interface PermissionPropertiesModel extends LucidRow {
  id: PrimaryKeyType;
  name: string;
  guardName?: string;
}

export interface RolePropertiesModel extends LucidRow {
  id: PrimaryKeyType;
  name: string;
  guardName?: string;
  teamId?: PrimaryKeyType | null;
}

export type RoleInstance = RolePropertiesModel & RoleableMixin;
export type PermissionInstance = PermissionPropertiesModel & PermissibleMixin;

export type RoleModelContract = LucidModel
  & ModelConstructor<RoleInstance> & {
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

export type PermissionModelContract = LucidModel
  & ModelConstructor<PermissionInstance> & {
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

export interface HasPermissionsProperties extends LucidRow {
  permissions: ManyToMany<LucidModel>;
}

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

export interface HasPermissionsMixin extends HasPermissionsMethods, HasPermissionsProperties {}

export type RoleableProperties = HasPermissionsProperties;

export interface RoleableMethods extends HasPermissionsMethods {
  modelsFor: <T extends LucidModel = LucidModel>(
    modelOrMorphType: string | T,
  ) => Promise<InstanceType<T>[]>;
}

export interface RoleableMixin extends RoleableMethods, RoleableProperties {}

export interface PermissibleProperties extends LucidRow {
  roles: ManyToMany<LucidModel>;
}

export interface PermissibleMethods {
  modelsFor: <T extends LucidModel = LucidModel>(
    modelOrMorphType: string | T,
  ) => Promise<InstanceType<T>[]>;
}

export interface PermissibleMixin extends PermissibleMethods, PermissibleProperties {}

export interface HasRolesProperties extends LucidRow {
  roles: ManyToMany<LucidModel>;
}

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

export interface HasRolesMixin extends HasRolesMethods, HasRolesProperties {}

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

export interface HasAuthorizableMixin
  extends HasAuthorizableMethods,
  HasRolesMixin,
  HasPermissionsMixin {}

export type Roleable = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
) => Model & RoleModelContract & ModelConstructor<InstanceType<Model> & RolePropertiesModel & RoleableMixin>;

export type Permissible = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
) => Model & PermissionModelContract & ModelConstructor<InstanceType<Model> & PermissionPropertiesModel & PermissibleMixin>;

export type HasPermissions = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
) => Model & ModelConstructor<InstanceType<Model> & HasPermissionsMixin>;

export type HasRoles = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
) => Model & ModelConstructor<InstanceType<Model> & HasRolesMixin>;

export type HasAuthorizable = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model,
) => Model & ModelConstructor<InstanceType<Model> & HasAuthorizableMixin>;

export interface CatalogInspectionResult {
  missingPermissions: string[];
  obsoletePermissions: { id: PrimaryKeyType; name: string; assignedCount: number }[];
  missingRoles: string[];
  obsoleteRoles: { id: PrimaryKeyType; name: string; assignedCount: number }[];
  rolesWithPermissionChanges: { role: string; toAttach: string[]; toDetach: string[] }[];
}

export interface SyncResult {
  permissions: { created: string[]; pruned: string[]; preserved: string[] };
  roles: { created: string[]; pruned: string[]; preserved: string[]; synced: Record<string, string[]> };
}

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
