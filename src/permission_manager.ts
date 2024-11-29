import { type CacheService } from '@adonisjs/cache/types';
import { BaseModel } from '@adonisjs/lucid/orm';
import { type LucidModel } from '@adonisjs/lucid/types/model';
import { type CacheProvider } from 'bentocache/types';
import { type ResolvedPermissionConfig } from './types.js';

export default class PermissionManager {
  declare protected cache: CacheProvider;

  protected cacheManager: CacheService;

  protected permissions?: string[];

  declare public pivotRole: string;

  declare public pivotPermission: string;

  declare public cacheExpirationTime: number | string;

  declare public teams: boolean;

  declare public teamsKey: string;

  protected teamId?: string | number;

  declare public cacheKey: string;

  private _config: ResolvedPermissionConfig;

  public constructor(cacheManager: CacheService, config: ResolvedPermissionConfig) {
    this.cacheManager = cacheManager;
    this._config = config;
    this.initializeCache();
  }

  public initializeCache(): void {
    this.cacheExpirationTime = this._config.cache.expirationTime;
    this.teams = this._config.teams;
    this.teamsKey = this._config.columnNames.teamForeignKey;
    this.cacheKey = this._config.cache.key;
    this.pivotRole = this._config.columnNames.rolePivotKey;
    this.pivotPermission = this._config.columnNames.permissionPivotKey;

    this.cache = this.getCacheProviderFromConfig();
  }

  public setPermissionsTeamId(id: string | number | InstanceType<LucidModel>): void {
    this.teamId = id instanceof BaseModel ? id.$primaryKeyValue : id;
  }

  public getPermissionsTeamId(): string | number | undefined {
    return this.teamId;
  }

  public async forgetCachedPermissions(): Promise<void> {
    this.permissions = undefined;
    this.forgetWildcardPermissionIndex();

    return this.cache.namespace(this.cacheKey).clear();
  }

  public forgetWildcardPermissionIndex(): void {
    // TODO: add how to clear
  }

  protected getCacheProviderFromConfig(): CacheProvider {
    const cacheDriver = this._config.cache.store;
    if (cacheDriver === 'default') {
      return this.cacheManager.use();
    }

    return this.cacheManager.use(cacheDriver);
  }
}
