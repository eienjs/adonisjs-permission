export class RoleAlreadyExists extends Error {
  public static create(roleName: string, guardName: string): RoleAlreadyExists {
    return new RoleAlreadyExists(
      `A role '${roleName}' already exists for guard '${guardName}'`,
    );
  }
}
