import { ErrorKey, ErrorValue } from '../decorators/ErrorConfigurable';
import { BaseError, BaseErrorEmbed } from '../interfaces/Components';

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
