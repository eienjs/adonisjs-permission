import { BaseCommand, flags } from '@adonisjs/core/ace';
import { CatalogSyncer } from '../src/catalog_syncer.js';
import { ModelResolver } from '../src/model_resolver.js';
import { PermissionRegistrar } from '../src/registrar.js';

export default class SyncRolesCommand extends BaseCommand {
  public static commandName = 'permissions:sync-roles';

  public static description = 'Synchronize only roles and role permissions from config.catalog';

  public static options = {
    startApp: true,
  };

  @flags.string({ description: 'Guard name to sync for' })
  public declare guard?: string;

  @flags.string({ description: 'Team ID (if teams are enabled)' })
  public declare teamId?: string;

  @flags.boolean({ description: 'Bypass confirmation prompts and forcefully delete assigned items' })
  public declare force: boolean;

  @flags.boolean({ description: 'Do not prune unlisted roles from database' })
  public declare noPrune: boolean;

  public async run(): Promise<void> {
    const resolver = ModelResolver.getInstance();
    const registrar = PermissionRegistrar.getInstance();
    const syncer = new CatalogSyncer(resolver.config, resolver, registrar);

    const guard = this.guard ?? resolver.config.defaultGuard;
    const teamId = this.teamId ?? null;
    const prune = !this.noPrune;

    const result = await syncer.syncAll({
      guard,
      teamId,
      prune,
      force: this.force,
      confirmHandler: async (items) => {
        if (items.roles.length === 0) {
          return true;
        }

        this.logger.warning(
          'The following roles are assigned to models but do not exist in config.catalog:',
        );
        for (const role of items.roles) {
          this.logger.warning(`  - Role \`${role.name}\` (assigned to ${role.assignedCount} models)`);
        }

        return this.prompt.confirm('Do you want to proceed with deleting these roles?', {
          default: false,
        });
      },
    });

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

    this.logger.success('Roles synchronization completed successfully!');
  }
}
