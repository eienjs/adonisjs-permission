export class RoleDoesNotExists extends Error {
  public static create(roleName: string, guardName: string): RoleDoesNotExists {
    return new RoleDoesNotExists(
      `There is no role named '${roleName}' for guard '${guardName}'`,
    );
  }

  public static withId(roleId: string | number, guardName: string): RoleDoesNotExists {
    return new RoleDoesNotExists(
      `There is no role with id '${roleId}' for guard '${guardName}'`,
    );
  }
}
