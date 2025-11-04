export class GuardDoesNotMatch extends Error {
  public static create(givenGuard: string, expectedGuards: string[]): GuardDoesNotMatch {
    return new GuardDoesNotMatch(
      `The given role or permission should use guard '${expectedGuards.join(', ')}' instead of '${givenGuard}'`,
    );
  }
}
