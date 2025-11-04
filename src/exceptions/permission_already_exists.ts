export class PermissionAlreadyExists extends Error {
  public static create(permissionName: string, guardName: string): PermissionAlreadyExists {
    return new PermissionAlreadyExists(
      `A '${permissionName}' permission already exists for guard '${guardName}'`,
    );
  }
}
