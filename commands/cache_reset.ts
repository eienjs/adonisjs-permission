import { BaseCommand } from '@adonisjs/core/ace';
import { PermissionRegistrar } from '../src/registrar.js';

export default class CacheResetCommand extends BaseCommand {
  public static commandName = 'permissions:cache-reset';

  public static description = 'Reset and clear the permissions and roles cache';

  public static options = {
    startApp: true,
  };

  public async run(): Promise<void> {
    try {
      const registrar = PermissionRegistrar.getInstance();
      registrar.clearCache();
      this.logger.success('Permissions and roles cache reset successfully!');
    } catch (error) {
      this.logger.error(`Failed to reset permission cache: ${(error as Error).message}`);
    }
  }
}
