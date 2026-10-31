import { args, BaseCommand, flags } from '@adonisjs/core/ace';
import stringHelpers from '@adonisjs/core/helpers/string';
import { ModelResolver } from '../src/model_resolver.js';
import { stubsRoot } from '../stubs/main.js';

export default class PivotTableCommand extends BaseCommand {
  public static commandName = 'permissions:pivot-table';

  public static description = 'Create the pivot table migration for a model with HasAuthorizable';

  public static options = {
    startApp: true,
    allowUnknownFlags: true,
  };

  @args.string({
    default: 'user',
    required: false,
    description: 'Name of the authorizable model class',
  })
  public declare name: string;

  @flags.string({
    description: 'Name of the permissions pivot table (e.g. user_has_permissions)',
    required: false,
  })
  public declare permissionsPivotTable?: string;

  @flags.string({
    description: 'Name of the roles pivot table (e.g. user_has_roles)',
    required: false,
  })
  public declare rolesPivotTable?: string;

  public async run(): Promise<void> {
    const entity = this.app.generators.createEntity(this.name);
    const modelSnake = stringHelpers.snakeCase(entity.name);
    const modelTable = stringHelpers.pluralize(modelSnake);

    const permissionsTableName = this.permissionsPivotTable ?? `${modelSnake}_has_permissions`;
    const rolesTableName = this.rolesPivotTable ?? `${modelSnake}_has_roles`;
    const fileName = `${Date.now()}_create_${modelSnake}_permissions_table.ts`;

    const resolver = ModelResolver.getInstance();
    const permissionsTable = resolver.config.tableNames.permissions;
    const rolesTable = resolver.config.tableNames.roles;

    const codemods = await this.createCodemods();

    await codemods.makeUsingStub(stubsRoot, 'migrations/authorizable_pivot.stub', {
      fileName,
      permissionPivotTable: permissionsTableName,
      rolePivotTable: rolesTableName,
      permissionsTable,
      rolesTable,
      modelTable,
      teams: resolver.config.teams,
      teamForeignKey: resolver.config.teamForeignKey,
    });

    this.logger.success(`Created pivot migration for model \`${entity.name}\``);
  }
}
