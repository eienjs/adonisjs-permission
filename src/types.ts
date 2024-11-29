/* eslint-disable @typescript-eslint/method-signature-style */
import { type CacheStores } from '@adonisjs/cache/types';
import { type LucidModel } from '@adonisjs/lucid/types/model';
import { type bentostore } from 'bentocache';

export interface WildcardContract {
  getIndex(): string[];

  implies(permission: string, guardName: string, index: string[]): boolean;
}

export type LucidWithRole = LucidModel & {
  findByName(name: string, guardName?: string): LucidModel;

  findById(id: string | number, guardName?: string): LucidModel;

  findOrCreate(name: string, guardName?: string): LucidModel;
};

export type PermissionConfig = {
  models?: {
    permission?: () => Promise<{ default: LucidModel }>;
    role?: () => Promise<{ default: LucidModel }>;
  };
  tableNames: {
    roles: string;
    permissions: string;
    modelHasPermissions?: string;
    modelHasRoles?: string;
    roleHasPermissions?: string;
  };
  columnNames?: {
    rolePivotKey?: string | null;
    permissionPivotKey?: string | null;
    modelMorphKey: string;
    teamForeignKey: string;
  };
  registerPermissionCheckMethod?: boolean;
  teams?: boolean;
  displayPermissionInException?: boolean;
  displayRoleInException?: boolean;
  enableWildcardPermission?: boolean;
  cache?: {
    expirationTime?: number | string;
    key?: string;
    store?: CacheStores extends Record<string, ReturnType<typeof bentostore>> ? keyof CacheStores : 'default';
  };
};

export type ResolvedPermissionConfig = {
  models: {
    permission: () => Promise<{ default: LucidModel }>;
    role: () => Promise<{ default: LucidModel }>;
  };
  tableNames: {
    roles: string;
    permissions: string;
    modelHasPermissions: string;
    modelHasRoles: string;
    roleHasPermissions: string;
  };
  columnNames: {
    rolePivotKey: string;
    permissionPivotKey: string;
    modelMorphKey: string;
    teamForeignKey: string;
  };
  registerPermissionCheckMethod: boolean;
  teams: boolean;
  displayPermissionInException: boolean;
  displayRoleInException: boolean;
  enableWildcardPermission: boolean;
  cache: {
    expirationTime: number | string;
    key: string;
    store: string;
  };
};
