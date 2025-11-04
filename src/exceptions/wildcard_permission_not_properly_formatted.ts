export class WildcardPermissionNotProperlyFormatted extends Error {
  public static create(permission: string): WildcardPermissionNotProperlyFormatted {
    return new WildcardPermissionNotProperlyFormatted(
      `Wildcard permission '${permission}' is not properly formatted`,
    );
  }
}
