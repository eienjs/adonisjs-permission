import type { PermissionInstance, RoleInstance } from '../src/types.js';
import { args, BaseCommand } from '@adonisjs/core/ace';
import { ModelResolver } from '../src/model_resolver.js';

export default class ShowPermissionsCommand extends BaseCommand {
  public static commandName = 'permissions:show';

  public static description = 'Show roles and permissions in a table';

  public static options = {
    startApp: true,
  };

  @args.string({ description: 'Guard name to filter by', required: false })
  public declare guard?: string;

  public async run(): Promise<void> {
    const resolver = ModelResolver.getInstance();
    const Role = resolver.getRoleModel();
    const Permission = resolver.getPermissionModel();

    let roleQuery = Role.query().preload('permissions' as never);
    let permQuery = Permission.query();

    if (this.guard) {
      roleQuery = roleQuery.where('guard_name', this.guard);
      permQuery = permQuery.where('guard_name', this.guard);
    }

    const roles = (await roleQuery) as unknown as (RoleInstance & {
      permissions: PermissionInstance[];
    })[];
    const permissions = (await permQuery) as unknown as PermissionInstance[];

    this.logger.info(`Permissions (${permissions.length.toString()}):`);
    if (permissions.length > 0) {
      const permTable = this.ui.table();
      permTable.head(['ID', 'Name', 'Guard']);
      for (const p of permissions) {
        permTable.row([String(p.id), p.name, p.guardName ?? 'web']);
      }
      permTable.render();
    } else {
      this.logger.warning('No permissions found.');
    }

    this.logger.info(`\nRoles (${roles.length.toString()}):`);
    if (roles.length > 0) {
      const roleTable = this.ui.table();
      roleTable.head(['ID', 'Name', 'Guard', 'Permissions']);
      for (const r of roles) {
        const rolePerms = r.permissions as unknown as PermissionInstance[];
        const permsList = rolePerms.map((p) => p.name).join(', ') || '(none)';
        roleTable.row([String(r.id), r.name, r.guardName ?? 'web', permsList]);
      }
      roleTable.render();
    } else {
      this.logger.warning('No roles found.');
    }
  }
}
