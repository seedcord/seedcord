import { Role } from 'discord.js';

import { CustomError } from '../interfaces/Components';

import type { TextChannel } from 'discord.js';

export class BotMissingPermissionsError extends CustomError {
  constructor(
    message: string,
    public missingPerms: string[],
    public roleOrChannel: Role | TextChannel
  ) {
    super(message);

    const missing = this.missingPerms.map((perm) => `• ${perm}`).join('\n');

    const errorSubtext =
      this.roleOrChannel instanceof Role
        ? `My role, <@&${this.roleOrChannel.id}>, is missing the following permissions:`
        : `I am missing the following permissions in <#${this.roleOrChannel.id}>:`;

    this.response.setDescription(
      `${errorSubtext}\n\nPlease ensure I have the following missing permission(s):\n${missing}`
    );
  }
}

export class RoleHigherThanMe extends CustomError {
  constructor(
    message: string,
    public role: Role,
    public botRole: Role
  ) {
    super(message);

    this.response.setDescription(
      `I cannot assign a role that is higher than me.\n\n` +
        `The role <@&${this.role.id}> is higher than my role <@&${this.botRole.id}> in the hierarchy.`
    );
  }
}

export class CannotAssignBotRole extends CustomError {
  constructor(message = 'I cannot assign a managed role.') {
    super(message);

    this.response.setDescription('I cannot assign a managed role.');
  }
}

export class RoleDoesNotExist extends CustomError {
  constructor(
    message: string,
    public roleId: string
  ) {
    super(message);

    this.response.setDescription(`The role with ID \`${this.roleId}\` does not exist.`);
  }
}

export class HasDangerousPermissions extends CustomError {
  constructor(
    message: string,
    public role: Role,
    public dangerousPerms: string[]
  ) {
    super(message);

    const dangerous = this.dangerousPerms.map((perm) => `• ${perm}`).join('\n');
    this.response.setDescription(
      `The role <@&${this.role.id}> has the following dangerous permissions:\n\n` +
        `Please ensure the following dangerous permission(s) are not enabled:\n${dangerous}`
    );
  }
}
