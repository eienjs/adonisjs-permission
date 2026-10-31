import type {
  PermissionModelContract,
  PermissionsColumnNames,
  PermissionsTableNames,
  ResolvedPermissionsConfig,
  RoleModelContract,
} from './types.js';

export const DEFAULT_TABLE_NAMES: PermissionsTableNames = {
  roles: 'roles',
  permissions: 'permissions',
  roleHasPermissions: 'role_has_permissions',
  modelHasRoles: 'model_has_roles',
  modelHasPermissions: 'model_has_permissions',
};

export const DEFAULT_COLUMN_NAMES: PermissionsColumnNames = {
  rolePivotKey: 'role_id',
  permissionPivotKey: 'permission_id',
  modelMorphKey: 'model_id',
  teamForeignKey: 'team_id',
};

export function getPivotTableNames(): PermissionsTableNames {
  try {
    return ModelResolver.getInstance().config.tableNames;
  } catch {
    return DEFAULT_TABLE_NAMES;
  }
}

export function getPivotColumnNames(): PermissionsColumnNames {
  try {
    return ModelResolver.getInstance().config.columnNames;
  } catch {
    return DEFAULT_COLUMN_NAMES;
  }
}

export class ModelResolver {
  private static instance: ModelResolver | null = null;

  private roleModel: RoleModelContract | null = null;

  private permissionModel: PermissionModelContract | null = null;

  public constructor(public config: ResolvedPermissionsConfig) {}

  public async resolve(): Promise<void> {
    if (!this.roleModel) {
      const module = await this.config.models.role();
      this.roleModel = module.default as unknown as RoleModelContract;
    }

    if (this.permissionModel) {
      return;
    }

    const module = await this.config.models.permission();
    this.permissionModel = module.default as unknown as PermissionModelContract;
  }

  public getRoleModel(): RoleModelContract {
    if (!this.roleModel) {
      throw new Error(
        'Role model has not been resolved. Make sure permissions configuration is loaded.',
      );
    }

    return this.roleModel;
  }

  public setRoleModel(model: RoleModelContract): void {
    this.roleModel = model;
  }

  public getPermissionModel(): PermissionModelContract {
    if (!this.permissionModel) {
      throw new Error(
        'Permission model has not been resolved. Make sure permissions configuration is loaded.',
      );
    }

    return this.permissionModel;
  }

  public setPermissionModel(model: PermissionModelContract): void {
    this.permissionModel = model;
  }

  public static getInstance(): ModelResolver {
    if (!this.instance) {
      throw new Error(
        'ModelResolver has not been initialized. Make sure PermissionsProvider is registered.',
      );
    }

    return this.instance;
  }

  public static setInstance(resolver: ModelResolver): void {
    this.instance = resolver;
  }
}
