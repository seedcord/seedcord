import { Notice } from '@seedcord/kit';
import { NoticeCard } from '@seedcord/kit/internal';
import { GuildMember, Role, TextChannel } from 'discord.js';

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
export class RoleHigherThanMe extends Notice {
    constructor(
        message: string,
        public role: Role,
        public botRole: Role
    ) {
        super(message);
    }

    render(): ReplyResponse {
        const card = new NoticeCard(
            `I cannot assign a role that is higher than me.\n\n` +
                `The role <@&${this.role.id}> is higher than my role <@&${this.botRole.id}> in the hierarchy.`
        );
        return { components: [card.component] };
    }
}

/**
 * Error thrown when attempting to assign a managed/bot role.
 */
export class CannotAssignBotRole extends Notice {
    constructor(message = 'I cannot assign a managed role.') {
        super(message);
    }

    render(): ReplyResponse {
        const card = new NoticeCard('I cannot assign a managed role.');
        return { components: [card.component] };
    }
}

/**
 * Error thrown when required permissions are missing.
 */
export class MissingPermissions extends Notice {
    constructor(
        message: string,
        public where: PermSubject,
        public missingPerms: string[]
    ) {
        super(message);
    }

    render(): ReplyResponse {
        const bullets = this.missingPerms.map((perm) => `• ${perm}`).join('\n');
        const card = new NoticeCard(
            `The ${labelFor(this.where)} ${mentionFor(this.where)} is missing the following permission entries:\n\n${bullets}`
        );
        return { components: [card.component] };
    }
}

/**
 * Error thrown when a target has permissions that must not be present.
 */
export class HasDangerousPermissions extends Notice {
    constructor(
        message: string,
        public target: PermSubject,
        public dangerousPerms: string[]
    ) {
        super(message);
    }

    render(): ReplyResponse {
        const bullets = this.dangerousPerms.map((perm) => `• ${perm}`).join('\n');
        const card = new NoticeCard(
            `The ${labelFor(this.target)} ${mentionFor(this.target)} has the following permission entries that must not be enabled:\n\n${bullets}`
        );
        return { components: [card.component] };
    }
}
