import type { ModelResolver } from './model_resolver.js';
import type { PermissionInstance, ResolvedPermissionsConfig, RoleInstance } from './types.js';

export interface CachedPermissionData {
  id: string | number;
  name: string;
  guardName: string;
  roles: { id: string | number; name: string; guardName: string; teamId?: string | number | null }[];
}

export class PermissionRegistrar {
  private static instance: PermissionRegistrar | null = null;

  private memoryCache: CachedPermissionData[] | null = null;

  private cacheExpiresAt: number | null = null;

  public constructor(
    private config: ResolvedPermissionsConfig,
    private modelResolver: ModelResolver,
  ) {}

  public async getPermissions(): Promise<CachedPermissionData[]> {
    if (!this.config.cache.enabled) {
      return this.loadPermissionsFromDb();
    }

    const now = Date.now();
    if (this.memoryCache && this.cacheExpiresAt && this.cacheExpiresAt > now) {
      return this.memoryCache;
    }

    const permissions = await this.loadPermissionsFromDb();
    this.memoryCache = permissions;

    const ttlMs = this.parseTtl(this.config.cache.ttl);
    this.cacheExpiresAt = now + ttlMs;

    return permissions;
  }

  public clearCache(): void {
    this.memoryCache = null;
    this.cacheExpiresAt = null;
  }

  public forgetCachedPermissions(): void {
    this.clearCache();
  }

  public static getInstance(): PermissionRegistrar {
    if (!this.instance) {
      throw new Error(
        'PermissionRegistrar has not been initialized. Make sure PermissionsProvider is registered.',
      );
    }

    return this.instance;
  }

  public static setInstance(registrar: PermissionRegistrar): void {
    this.instance = registrar;
  }

  private async loadPermissionsFromDb(): Promise<CachedPermissionData[]> {
    const Permission = this.modelResolver.getPermissionModel();

    const permissions = (await Permission.query().preload('roles' as never)) as unknown as (Omit<
      PermissionInstance,
      'roles'
    > & {
      roles: RoleInstance[];
    })[];

    return permissions.map((perm) => {
      const roles = perm.roles.map((r) => ({
        id: r.id,
        name: r.name,
        guardName: r.guardName ?? this.config.defaultGuard,
        teamId: r.teamId ?? null,
      }));

      return {
        id: perm.id,
        name: perm.name,
        guardName: perm.guardName ?? this.config.defaultGuard,
        roles,
      };
    });
  }

  private parseTtl(ttl: string | number | undefined): number {
    if (typeof ttl === 'number') {
      return ttl;
    }

    if (!ttl) {
      return 24 * 60 * 60 * 1000;
    }

    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) {
      return 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': {
        return value * 1000;
      }
      case 'm': {
        return value * 60 * 1000;
      }
      case 'h': {
        return value * 60 * 60 * 1000;
      }
      case 'd': {
        return value * 24 * 60 * 60 * 1000;
      }
      default: {
        return 24 * 60 * 60 * 1000;
      }
    }
  }
}
