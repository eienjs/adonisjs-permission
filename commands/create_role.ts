import { args, BaseCommand, flags } from '@adonisjs/core/ace';
import { ModelResolver } from '../src/model_resolver.js';
import { PermissionRegistrar } from '../src/registrar.js';

export default class CreateRoleCommand extends BaseCommand {
  public static commandName = 'permissions:create-role';

  public static description = 'Create a new role and optionally assign permissions';

  public static options = {
    startApp: true,
  };

  @args.string({ description: 'Name of the role' })
  public declare name: string;

  @args.string({ description: 'Guard name', required: false })
  public declare guard?: string;

  @args.string({
    description: 'Permissions to attach separated by | or comma (e.g. "edit posts|delete posts")',
    required: false,
  })
  public declare permissions?: string;

  @flags.string({ description: 'Team ID (if teams are enabled)' })
  public declare teamId?: string;

  public async run(): Promise<void> {
    const resolver = ModelResolver.getInstance();
    const Role = resolver.getRoleModel();
    const guard = this.guard ?? resolver.config.defaultGuard;

    const payload: { name: string; guardName: string; [key: string]: unknown } = {
      name: this.name,
      guardName: guard,
    };

    if (resolver.config.teams && this.teamId !== undefined) {
      payload[resolver.config.teamForeignKey] = this.teamId;
    }

    const role = await Role.findOrCreate(payload);
    this.logger.success(`Role \`${this.name}\` created for guard \`${guard}\``);

    if (this.permissions) {
      const perms = this.permissions
        .split(/[|,]/)
        .map((p) => p.trim())
        .filter(Boolean);

      await role.syncPermissions(...perms);
      this.logger.success(`Attached permissions [${perms.join(', ')}] to role \`${this.name}\``);
    }

    try {
      PermissionRegistrar.getInstance().forgetCachedPermissions();
    } catch {
      // ignore
    }
  }
}
