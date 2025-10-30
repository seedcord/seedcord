import { Role } from 'discord.js';

import { CustomError } from '@interfaces/Components';

import type { TextChannel } from 'discord.js';

/**
 * Error thrown when the bot lacks necessary permissions to perform an action.
 */
export class MissingPermissions extends CustomError {
    /**
     * Creates a new BotMissingPermissionsError.
     *
     * @param message - The error message
     * @param missingPerms - Array of missing permission names
     * @param roleOrChannel - The role or channel where permissions are missing
     */
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

/**
 * Error thrown when attempting to modify a role higher than the bot's highest role.
 */
export class RoleHigherThanMe extends CustomError {
    /**
     * Creates a new RoleHigherThanMe error.
     *
     * @param message - The error message
     */
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

/**
 * Error thrown when attempting to assign a managed/bot role.
 */
export class CannotAssignBotRole extends CustomError {
    /**
     * Creates a new CannotAssignBotRole error.
     *
     * @param message - The error message
     */
    constructor(message = 'I cannot assign a managed role.') {
        super(message);

        this.response.setDescription('I cannot assign a managed role.');
    }
}

/**
 * Error thrown when a requested role does not exist.
 */
export class RoleDoesNotExist extends CustomError {
    /**
     * Creates a new RoleDoesNotExist error.
     *
     * @param message - The error message
     * @param roleId - The ID of the role that doesn't exist
     */
    constructor(
        message: string,
        public roleId: string
    ) {
        super(message);

        this.response.setDescription(`The role with ID \`${this.roleId}\` does not exist.`);
    }
}

/**
 * Error thrown when a role has dangerous permissions that shouldn't be assigned.
 */
export class HasDangerousPermissions extends CustomError {
    /**
     * Creates a new HasDangerousPermissions error.
     *
     * @param message - The error message
     * @param role - The role with dangerous permissions
     * @param dangerousPerms - Array of dangerous permission names
     */
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
