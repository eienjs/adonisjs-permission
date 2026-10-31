import type { ApplicationService } from '@adonisjs/core/types';
import type { PermissionsConfig, ResolvedPermissionsConfig } from '../src/types.js';
import { configProvider } from '@adonisjs/core';
import { RuntimeException } from '@adonisjs/core/exceptions';
import { CatalogSyncer } from '../src/catalog_syncer.js';
import { registerEdgeDirectives } from '../src/edge/index.js';
import { ModelResolver } from '../src/model_resolver.js';
import { PermissionRegistrar } from '../src/registrar.js';
import { TeamManager } from '../src/team_manager.js';

export default class PermissionsProvider {
  public constructor(protected app: ApplicationService) {}

  public register(): void {
    this.app.container.singleton('permission.resolver', async () => {
      const permissionConfigProvider = this.app.config.get<PermissionsConfig>('permissions');
      const config = await configProvider.resolve<ResolvedPermissionsConfig>(
        this.app,
        permissionConfigProvider,
      );

      if (!config) {
        throw new RuntimeException(
          'Invalid "config/permissions.ts" file. Make sure you are using the "defineConfig" method',
        );
      }

      const resolver = new ModelResolver(config);
      ModelResolver.setInstance(resolver);

      return resolver;
    });

    this.app.container.singleton('permission.registrar', async () => {
      const resolver = await this.app.container.make('permission.resolver');
      const registrar = new PermissionRegistrar(resolver.config, resolver);
      PermissionRegistrar.setInstance(registrar);

      return registrar;
    });

    this.app.container.singleton('permission.team_manager', () => {
      return TeamManager.getInstance();
    });

    this.app.container.singleton('permission.syncer', async () => {
      const resolver = await this.app.container.make('permission.resolver');
      const registrar = await this.app.container.make('permission.registrar');

      return new CatalogSyncer(resolver.config, resolver, registrar);
    });
  }

  public async boot(): Promise<void> {
    const resolver = await this.app.container.make('permission.resolver');
    await resolver.resolve();
    await this.app.container.make('permission.registrar');

    // Register Edge directives if View/Edge is registered
    if (this.app.container.hasBinding('edge')) {
      try {
        const edge: unknown = await this.app.container.make('edge' as never);
        registerEdgeDirectives(edge);
      } catch {
        // ignore if edge fails to resolve
      }
    }
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'permission.resolver': ModelResolver;
    'permission.registrar': PermissionRegistrar;
    'permission.team_manager': TeamManager;
    'permission.syncer': CatalogSyncer;
  }
}
