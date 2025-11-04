export class WildcardPermissionInvalidArgument extends Error {
  public static create(): WildcardPermissionInvalidArgument {
    return new WildcardPermissionInvalidArgument(
      'Wildcard permission must be string, permission id or permission instance',
    );
  }
}
