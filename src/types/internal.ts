import type { LucidRow } from '@adonisjs/lucid/types/model';
import type {
  PermissionInstance,
  PermissionsCacheConfig,
  PermissionsCatalogConfig,
  PermissionsColumnNames,
  PermissionsEventsConfig,
  PermissionsModelsConfig,
  PermissionsMorphMapConfig,
  PermissionsSuperAdminConfig,
  PermissionsTableNames,
  PrimaryKeyType,
  RoleInstance,
} from './main.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModelConstructor<T> = new (...args: any[]) => T;

/**
 * Resolved and sanitized configuration object used by internal runtime services.
 */
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

export interface RolePropertiesModel extends LucidRow {
  id: PrimaryKeyType;
  name: string;
  guardName?: string;
  teamId?: PrimaryKeyType | null;
}

export interface PermissionPropertiesModel extends LucidRow {
  id: PrimaryKeyType;
  name: string;
  guardName?: string;
}

export interface PivotQueryBuilder {
  wherePivot: (col: string, val: unknown) => PivotQueryBuilder;
  whereNullPivot: (col: string) => PivotQueryBuilder;
  whereInPivot: (col: string, vals: PrimaryKeyType[]) => PivotQueryBuilder;
  del: () => Promise<number>;
}

export interface RelationQueryBuilder<TInstance = LucidRow> {
  where: (col: string, val: unknown) => RelationQueryBuilder<TInstance>;
  whereIn: (col: string, values: unknown[]) => RelationQueryBuilder<TInstance>;
  wherePivot: (col: string, val: unknown) => RelationQueryBuilder<TInstance>;
  whereNullPivot: (col: string) => RelationQueryBuilder<TInstance>;
  first: () => Promise<LucidRow | null>;
  then: <TResult1 = TInstance[], TResult2 = never>(
    onfulfilled?: ((value: TInstance[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

export interface InternalHasRolesInstance {
  currentTeamId?: PrimaryKeyType | null;
  guardName?: string;
  roles: RoleInstance[];
  load: (relation: string) => Promise<void>;
  related: (relation: string) => {
    attach: (payload: Record<string | number, Record<string, unknown>> | (string | number)[]) => Promise<void>;
    sync: (payload: Record<string | number, Record<string, unknown>>) => Promise<void>;
    detach: (ids?: (string | number)[]) => Promise<void>;
    pivotQuery: () => PivotQueryBuilder;
    query: () => RelationQueryBuilder<RoleInstance>;
  };
}

export interface InternalHasPermissionsInstance {
  currentTeamId?: PrimaryKeyType | null;
  usesMorphPivot?: boolean;
  guardName?: string;
  permissions: PermissionInstance[];
  load: (relation: string) => Promise<void>;
  related: (relation: string) => {
    attach: (payload: Record<string | number, Record<string, unknown>> | (string | number)[]) => Promise<void>;
    sync: (payload: Record<string | number, Record<string, unknown>>) => Promise<void>;
    detach: (ids?: (string | number)[]) => Promise<void>;
    pivotQuery: () => PivotQueryBuilder;
    query: () => RelationQueryBuilder<PermissionInstance>;
  };
}

export interface AuthorizableWhereHasQuery {
  wherePivot: (col: string, val: unknown) => AuthorizableWhereHasQuery;
  whereNullPivot: (col: string) => AuthorizableWhereHasQuery;
  first: () => Promise<LucidRow | null>;
}

export interface AuthorizableRolesQuery {
  wherePivot: (col: string, val: unknown) => AuthorizableRolesQuery;
  whereNullPivot: (col: string) => AuthorizableRolesQuery;
  whereHas: (
    rel: string,
    callback: (q: { where: (col: string, val: unknown) => void }) => void,
  ) => AuthorizableWhereHasQuery;
  first: () => Promise<LucidRow | null>;
  then: <TResult1 = RoleInstance[], TResult2 = never>(
    onfulfilled?: ((value: RoleInstance[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

export interface InternalAuthorizableInstance {
  currentTeamId?: PrimaryKeyType | null;
  guardName?: string;
  hasRole: (role: string) => Promise<boolean>;
  hasDirectPermission: (permission: string | LucidRow) => Promise<boolean>;
  getDirectPermissions: () => Promise<LucidRow[]>;
  related: (relation: string) => {
    query: () => AuthorizableRolesQuery;
  };
}

/**
 * Internal database query row result for aggregate COUNT queries.
 */
export interface CountRow {
  total?: string | number;
}

/**
 * Internal contract for internationalization service check in HttpContext.
 */
export interface I18nLike {
  t: (identifier: string, data?: Record<string, unknown>, fallback?: string) => string;
}

/**
 * Cached permissions data entry structure stored in memory cache.
 */
export interface CachedPermissionData {
  id: PrimaryKeyType;
  name: string;
  guardName: string;
  roles: { id: PrimaryKeyType; name: string; guardName: string; teamId?: PrimaryKeyType | null }[];
}

/**
 * AsyncLocalStorage internal team context store.
 */
export interface TeamStore {
  teamId: PrimaryKeyType | null;
}

/**
 * Authenticated user object contract expected by permission middlewares.
 */
export interface AuthorizableUserContract {
  hasAnyPermission?: (...permissions: string[]) => Promise<boolean>;
  hasPermissionTo?: (permission: string) => Promise<boolean>;
  hasAnyRole?: (...roles: string[]) => Promise<boolean>;
  hasRole?: (role: string) => Promise<boolean>;
}

/**
 * HttpContext authentication state shape.
 */
export interface AuthContextLike {
  auth?: {
    user?: AuthorizableUserContract;
  };
}

/**
 * Edge template buffer contract.
 */
export interface EdgeBufferContract {
  writeLine: (text: string) => void;
}

/**
 * Edge template parser contract.
 */
export interface EdgeParserContract {
  utils: {
    stringify: (value: unknown) => string;
  };
  process: (children: unknown[], buffer: EdgeBufferContract) => void;
}

/**
 * Edge tag token contract.
 */
export interface EdgeTagTokenContract {
  properties: {
    jsArg: unknown;
  };
  children: unknown[];
}

/**
 * Edge template engine contract for custom tag registration.
 */
export interface EdgeContract {
  registerTag: (tag: {
    block: boolean;
    seekable: boolean;
    tagName: string;
    compile: (
      parser: EdgeParserContract,
      buffer: EdgeBufferContract,
      token: EdgeTagTokenContract,
    ) => void;
  }) => void;
}
