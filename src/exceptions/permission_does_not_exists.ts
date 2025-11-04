export class PermissionDoesNotExists extends Error {
  public static create(permissionName: string, guardName: string): PermissionDoesNotExists {
    return new PermissionDoesNotExists(
      `There is no permission named '${permissionName}' for guard '${guardName}'`,
    );
  }

  public static withId(permissionId: string | number, guardName: string): PermissionDoesNotExists {
    return new PermissionDoesNotExists(
      `There is no permission with id '${permissionId}' for guard '${guardName}'`,
    );
  }
}
