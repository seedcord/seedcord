import { Role, TextChannel } from 'discord.js';
import { ErrorKey, ErrorValue } from '../decorators/ErrorConfigurable';
import { BaseError, BaseErrorEmbed, CustomError } from '../interfaces/Components';

// ------

@ErrorKey('BotMissingPermissionsError')
export class BotMissingPermissionsError extends CustomError {
  constructor(
    message: string,
    public missingPerms: string[],
    public roleOrChannel: Role | TextChannel
  ) {
    super(message);
  }
}

@ErrorValue('BotMissingPermissionsError')
export class BotMissingPermissionsErrorEmbed extends BaseErrorEmbed {
  constructor(error: BotMissingPermissionsError) {
    super();
    const missing = error.missingPerms.map((perm) => `• ${perm}`).join('\n');

    const errorSubtext =
      error.roleOrChannel instanceof Role
        ? `My role, <@&${error.roleOrChannel.id}>, is missing the following permissions:`
        : `I am missing the following permissions in <#${error.roleOrChannel.id}>:`;

    this.instance.setDescription(
      `${errorSubtext}\n\n` + `Please ensure I have the following missing permission(s):\n${missing}`
    );
  }
}

// ------

@ErrorKey('RoleHigherThanMe')
export class RoleHigherThanMe extends CustomError {
  constructor(
    message: string,
    public role: Role,
    public botRole: Role
  ) {
    super(message);
  }
}

@ErrorValue('RoleHigherThanMe')
export class RoleHigherThanMeEmbed extends BaseErrorEmbed {
  constructor(error: RoleHigherThanMe) {
    super();
    this.instance.setDescription(
      `I cannot assign a role that is higher than me.\n\n` +
        `The role <@&${error.role.id}> is higher than my role <@&${error.botRole.id}> in the hierarchy.`
    );
  }
}

// ------

@ErrorKey('CannotAssignBotRole')
export class CannotAssignBotRole extends BaseError {}

@ErrorValue('CannotAssignBotRole')
export class CannotAssignBotRoleEmbed extends BaseErrorEmbed {
  constructor() {
    super();
    this.instance.setDescription(`I cannot assign a managed role.`);
  }
}

// ------

@ErrorKey('RoleDoesNotExist')
export class RoleDoesNotExist extends CustomError {
  constructor(
    message: string,
    public roleId: string
  ) {
    super(message);
  }
}

@ErrorValue('RoleDoesNotExist')
export class RoleDoesNotExistEmbed extends BaseErrorEmbed {
  constructor(error: RoleDoesNotExist) {
    super();
    this.instance.setDescription(`The role with ID \`${error.roleId}\` does not exist.`);
  }
}

// ------

@ErrorKey('HasDangerousPermissions')
export class HasDangerousPermissions extends CustomError {
  constructor(
    message: string,
    public role: Role,
    public dangerousPerms: string[]
  ) {
    super(message);
  }
}

@ErrorValue('HasDangerousPermissions')
export class HasDangerousPermissionsEmbed extends BaseErrorEmbed {
  constructor(error: HasDangerousPermissions) {
    super();
    const dangerous = error.dangerousPerms.map((perm) => `• ${perm}`).join('\n');

    this.instance.setDescription(
      `The role <@&${error.role.id}> has the following dangerous permissions:\n\n` +
        `Please ensure the following dangerous permission(s) are not enabled:\n${dangerous}`
    );
  }
}
