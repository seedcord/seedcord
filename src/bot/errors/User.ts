import { ErrorKey, ErrorValue } from '../decorators/ErrorConfigurable';
import { BaseError, BaseErrorEmbed, CustomError } from '../interfaces/Components';

@ErrorKey('UserNotInGuild')
export class UserNotInGuild extends BaseError {}

@ErrorValue('UserNotInGuild')
export class UserNotInGuildEmbed extends BaseErrorEmbed {
  constructor() {
    super();
    this.instance.setDescription('User is not in the guild.');
  }
}

// ------

@ErrorKey('UserNotFound')
export class UserNotFound extends CustomError {
  constructor(public readonly userArg: string) {
    super(`User not found: ${userArg}`);
  }
}

@ErrorValue('UserNotFound')
export class UserNotFoundEmbed extends BaseErrorEmbed {
  constructor(e: UserNotFound) {
    super();
    this.instance
      .setTitle('User Not Found')
      .setDescription(
        `User probably doesn't exist or was deleted.\n` +
          `**User Argument:** \`${e.userArg}\`\n` +
          `Please check the user ID and try again. Only pass valid user IDs as the argument.`
      );
  }
}

// ------

@ErrorKey('UserAlreadyHasAccess')
export class UserAlreadyHasAccess extends BaseError {}

@ErrorValue('UserAlreadyHasAccess')
export class UserAlreadyHasAccessEmbed extends BaseErrorEmbed {
  constructor() {
    super();
    this.instance.setDescription('You already have the access this role provides.');
  }
}

// ------

@ErrorKey('MissingPermissions')
export class MissingPermissions extends BaseError {}

@ErrorValue('MissingPermissions')
export class MissingPermissionsEmbed extends BaseErrorEmbed {
  constructor() {
    super();
    this.instance.setDescription('You do not have the required permissions.');
  }
}
