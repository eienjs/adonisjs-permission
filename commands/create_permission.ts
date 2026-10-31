import { args, BaseCommand } from '@adonisjs/core/ace';
import { ModelResolver } from '../src/model_resolver.js';
import { PermissionRegistrar } from '../src/registrar.js';

export default class CreatePermissionCommand extends BaseCommand {
  public static commandName = 'permissions:create-permission';

  public static description = 'Create a new permission';

  public static options = {
    startApp: true,
  };

  @args.string({ description: 'Name of the permission' })
  public declare name: string;

  @args.string({ description: 'Guard name', required: false })
  public declare guard?: string;

  public async run(): Promise<void> {
    const resolver = ModelResolver.getInstance();
    const Permission = resolver.getPermissionModel();
    const guard = this.guard ?? resolver.config.defaultGuard;

    await Permission.findOrCreate({
      name: this.name,
      guardName: guard,
    });

    this.logger.success(`Permission \`${this.name}\` created for guard \`${guard}\``);

    try {
      PermissionRegistrar.getInstance().forgetCachedPermissions();
    } catch {
      // ignore
    }
  }
}
