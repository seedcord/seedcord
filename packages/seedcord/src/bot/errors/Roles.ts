import { GuildMember, Role, TextChannel } from 'discord.js';

import { CustomError } from '@interfaces/Components';

import type { Guild } from 'discord.js';

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
 * Error thrown when required permissions are missing.
 */
export class MissingPermissions extends CustomError {
    /**
     * Creates a new MissingPermissions error.
     *
     * @param message - The error message
     * @param missingPerms - Array of missing permission names
     * @param where - Location or subject where permissions are missing
     */
    constructor(
        message: string,
        public where: Role | TextChannel | Guild | GuildMember,
        public missingPerms: string[]
    ) {
        super(message);

        const bullets = this.missingPerms.map((perm) => `• ${perm}`).join('\n');

        const mention =
            this.where instanceof Role
                ? `<@&${this.where.id}>`
                : this.where instanceof TextChannel
                  ? `<#${this.where.id}>`
                  : this.where instanceof GuildMember
                    ? `<@${this.where.id}>`
                    : `\`${this.where.name}\``;

        const label =
            this.where instanceof Role
                ? 'role'
                : this.where instanceof TextChannel
                  ? 'channel'
                  : this.where instanceof GuildMember
                    ? 'member'
                    : 'guild';

        this.response.setDescription(
            `The ${label} ${mention} is missing the following permission entries:\n\n${bullets}`
        );
    }
}

/**
 * Error thrown when a target has permissions that must not be present.
 */
export class HasDangerousPermissions extends CustomError {
    /**
     * Creates a new HasDangerousPermissions error.
     *
     * @param message - The error message
     * @param target - The subject that has the unwanted permissions
     * @param dangerousPerms - Array of dangerous permission names
     */
    constructor(
        message: string,
        public target: Role | TextChannel | Guild | GuildMember,
        public dangerousPerms: string[]
    ) {
        super(message);

        const bullets = this.dangerousPerms.map((perm) => `• ${perm}`).join('\n');

        const mention =
            this.target instanceof Role
                ? `<@&${this.target.id}>`
                : this.target instanceof TextChannel
                  ? `<#${this.target.id}>`
                  : this.target instanceof GuildMember
                    ? `<@${this.target.id}>`
                    : `\`${this.target.name}\``;

        const label =
            this.target instanceof Role
                ? 'role'
                : this.target instanceof TextChannel
                  ? 'channel'
                  : this.target instanceof GuildMember
                    ? 'member'
                    : 'guild';

        this.response.setDescription(
            `The ${label} ${mention} has the following permission entries that must not be enabled:\n\n${bullets}`
        );
    }
}
