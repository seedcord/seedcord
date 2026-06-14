import { GuildMember, Role, TextChannel } from 'discord.js';

import { Denial, DenialEmbed } from '@interfaces/Components';

import type { ReplyResponse } from '@seedcord/types';
import type { Guild } from 'discord.js';

type PermSubject = Role | TextChannel | Guild | GuildMember;

function mentionFor(subject: PermSubject): string {
    if (subject instanceof Role) return `<@&${subject.id}>`;
    if (subject instanceof TextChannel) return `<#${subject.id}>`;
    if (subject instanceof GuildMember) return `<@${subject.id}>`;
    return `\`${subject.name}\``;
}

function labelFor(subject: PermSubject): string {
    if (subject instanceof Role) return 'role';
    if (subject instanceof TextChannel) return 'channel';
    if (subject instanceof GuildMember) return 'member';
    return 'guild';
}

/**
 * Error thrown when attempting to modify a role higher than the bot's highest role.
 */
export class RoleHigherThanMe extends Denial {
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
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(
            `I cannot assign a role that is higher than me.\n\n` +
                `The role <@&${this.role.id}> is higher than my role <@&${this.botRole.id}> in the hierarchy.`
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Error thrown when attempting to assign a managed/bot role.
 */
export class CannotAssignBotRole extends Denial {
    /**
     * Creates a new CannotAssignBotRole error.
     *
     * @param message - The error message
     */
    constructor(message = 'I cannot assign a managed role.') {
        super(message);
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed('I cannot assign a managed role.');
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Error thrown when a requested role does not exist.
 */
export class RoleDoesNotExist extends Denial {
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
    }

    render(): ReplyResponse {
        const embed = new DenialEmbed(`The role with ID \`${this.roleId}\` does not exist.`);
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Error thrown when required permissions are missing.
 */
export class MissingPermissions extends Denial {
    /**
     * Creates a new MissingPermissions error.
     *
     * @param message - The error message
     * @param where - Location or subject where permissions are missing
     * @param missingPerms - Array of missing permission names
     */
    constructor(
        message: string,
        public where: PermSubject,
        public missingPerms: string[]
    ) {
        super(message);
    }

    render(): ReplyResponse {
        const bullets = this.missingPerms.map((perm) => `• ${perm}`).join('\n');
        const embed = new DenialEmbed(
            `The ${labelFor(this.where)} ${mentionFor(this.where)} is missing the following permission entries:\n\n${bullets}`
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}

/**
 * Error thrown when a target has permissions that must not be present.
 */
export class HasDangerousPermissions extends Denial {
    /**
     * Creates a new HasDangerousPermissions error.
     *
     * @param message - The error message
     * @param target - The subject that has the unwanted permissions
     * @param dangerousPerms - Array of dangerous permission names
     */
    constructor(
        message: string,
        public target: PermSubject,
        public dangerousPerms: string[]
    ) {
        super(message);
    }

    render(): ReplyResponse {
        const bullets = this.dangerousPerms.map((perm) => `• ${perm}`).join('\n');
        const embed = new DenialEmbed(
            `The ${labelFor(this.target)} ${mentionFor(this.target)} has the following permission entries that must not be enabled:\n\n${bullets}`
        );
        return { kind: 'embed', embeds: [embed.component] };
    }
}
