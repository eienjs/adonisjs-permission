import { BaseCommand, flags } from '@adonisjs/core/ace';
import { CatalogSyncer } from '../src/catalog_syncer.js';
import { ModelResolver } from '../src/model_resolver.js';
import { PermissionRegistrar } from '../src/registrar.js';

export default class SyncCommand extends BaseCommand {
  public static commandName = 'permissions:sync';

  public static description = 'Synchronize roles and permissions from config.catalog';

  public static options = {
    startApp: true,
  };

  @flags.string({ description: 'Guard name to sync for' })
  public declare guard?: string;

  @flags.string({ description: 'Team ID (if teams are enabled)' })
  public declare teamId?: string;

  @flags.boolean({ description: 'Bypass confirmation prompts and forcefully delete assigned items' })
  public declare force: boolean;

  @flags.boolean({ description: 'Do not prune unlisted roles and permissions from database' })
  public declare noPrune: boolean;

  public async run(): Promise<void> {
    const resolver = ModelResolver.getInstance();
    const registrar = PermissionRegistrar.getInstance();
    const syncer = new CatalogSyncer(resolver.config, resolver, registrar);

    const guard = this.guard ?? resolver.config.defaultGuard;
    const teamId = this.teamId ?? null;
    const prune = !this.noPrune;

    this.logger.info(`Inspecting permissions and roles catalog (guard: ${guard})...`);

    const result = await syncer.syncAll({
      guard,
      teamId,
      prune,
      force: this.force,
      confirmHandler: async (items) => {
        this.logger.warning(
          'The following items are currently assigned to users/models in database but do not exist in catalog:',
        );

        for (const role of items.roles) {
          this.logger.warning(`  - Role \`${role.name}\` (assigned to ${role.assignedCount} models)`);
        }

        for (const perm of items.permissions) {
          this.logger.warning(
            `  - Permission \`${perm.name}\` (assigned to ${perm.assignedCount} models/roles)`,
          );
        }

        const proceed = await this.prompt.confirm(
          'Do you want to proceed with deleting these items and detaching their assignments?',
          { default: false },
        );

        return proceed;
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
        `Preserved assigned permissions (not deleted): ${result.permissions.preserved.join(', ')}`,
      );
    }

    if (result.roles.created.length > 0) {
      this.logger.success(`Created roles: ${result.roles.created.join(', ')}`);
    }

    if (result.roles.pruned.length > 0) {
      this.logger.info(`Pruned roles: ${result.roles.pruned.join(', ')}`);
    }

    if (result.roles.preserved.length > 0) {
      this.logger.warning(
        `Preserved assigned roles (not deleted): ${result.roles.preserved.join(', ')}`,
      );
    }

    for (const [role, perms] of Object.entries(result.roles.synced)) {
      this.logger.info(`Synced role \`${role}\` with ${perms.length} permissions`);
    }

    this.logger.success('Catalog synchronization completed successfully!');
  }
}
