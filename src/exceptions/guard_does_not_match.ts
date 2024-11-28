import { InvalidArgumentsException } from '@adonisjs/core/exceptions';

export default class GuardDoesNotMatch extends InvalidArgumentsException {
  public static create(givenGuard: string, expectedGuards: string[]): GuardDoesNotMatch {
    return new this(
      `The given role or permission should use guard '${expectedGuards.join(', ')}' instead of '${givenGuard}'`,
    );
  }
}
