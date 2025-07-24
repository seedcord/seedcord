import { CustomError } from '../interfaces/Components';

export class UserNotInGuild extends CustomError {
  constructor(message = 'User is not in the guild.') {
    super(message);

    this.response.setDescription('User is not in the guild.');
  }
}

export class UserNotFound extends CustomError {
  constructor(public readonly userArg: string) {
    super(`User not found: ${userArg}`);

    this.response
      .setTitle('User Not Found')
      .setDescription(
        `User probably doesn't exist or was deleted.\n` +
          `**User Argument:** \`${this.userArg}\`\n` +
          `Please check the user ID and try again. Only pass valid user IDs as the argument.`
      );
  }
}

export class UserAlreadyHasAccess extends CustomError {
  constructor(message = 'You already have the access this role provides.') {
    super(message);
    this._emit = true;

    this.response.setDescription('You already have the access this role provides.');
  }
}

export class MissingPermissions extends CustomError {
  constructor(message = 'You do not have the required permissions.') {
    super(message);

    this.response.setDescription('You do not have the required permissions.');
  }
}
