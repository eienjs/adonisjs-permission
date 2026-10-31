import { BaseCommand, flags } from '@adonisjs/core/ace';
import { CatalogSyncer } from '../src/catalog_syncer.js';
import { ModelResolver } from '../src/model_resolver.js';
import { PermissionRegistrar } from '../src/registrar.js';

export default class SyncPermissionsCommand extends BaseCommand {
  public static commandName = 'permissions:sync-permissions';

  public static description = 'Synchronize only permissions from config.catalog';

  public static options = {
    startApp: true,
  };

  @flags.string({ description: 'Guard name to sync for' })
  public declare guard?: string;

  @flags.boolean({ description: 'Bypass confirmation prompts and forcefully delete assigned items' })
  public declare force: boolean;

  @flags.boolean({ description: 'Do not prune unlisted permissions from database' })
  public declare noPrune: boolean;

  public async run(): Promise<void> {
    const resolver = ModelResolver.getInstance();
    const registrar = PermissionRegistrar.getInstance();
    const syncer = new CatalogSyncer(resolver.config, resolver, registrar);

    const guard = this.guard ?? resolver.config.defaultGuard;
    const prune = !this.noPrune;

    const result = await syncer.syncAll({
      guard,
      prune,
      force: this.force,
      confirmHandler: async (items) => {
        if (items.permissions.length === 0) {
          return true;
        }

        this.logger.warning(
          'The following permissions are assigned but do not exist in config.catalog:',
        );
        for (const perm of items.permissions) {
          this.logger.warning(
            `  - Permission \`${perm.name}\` (assigned to ${perm.assignedCount} models/roles)`,
          );
        }

        return this.prompt.confirm('Do you want to proceed with deleting these permissions?', {
          default: false,
        });
      },
    });

    if (result.permissions.created.length > 0) {
      this.logger.success(`Created permissions: ${result.permissions.created.join(', ')}`);
    }

    if (result.permissions.pruned.length > 0) {
      this.logger.info(`Pruned permissions: ${result.permissions.pruned.join(', ')}`);
    }

    if (result.permissions.preserved.length > 0) {
      this.logger.warning(
        `Preserved assigned permissions: ${result.permissions.preserved.join(', ')}`,
      );
    }

    this.logger.success('Permissions synchronization completed successfully!');
  }
}
