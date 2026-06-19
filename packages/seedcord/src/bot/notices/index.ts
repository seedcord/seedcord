import { Notice } from '@seedcord/kit';
import { NoticeCard } from '@seedcord/kit/internal';
import { toEpochSeconds } from '@seedcord/utils';

import { labelFor, mentionFor } from './utils';

import type { PermSubject } from './utils';
import type { EpochMs, ReplyResponse } from '@seedcord/types';
import type { Role } from 'discord.js';

// base for the catalog gate refusals, rendered as the bot's standard notice card
abstract class GateNotice extends Notice {
    public render(): ReplyResponse {
        return { components: [new NoticeCard(this.message).component] };
    }
}

// ----- catalog gate refusals -----

export class NotOwner extends GateNotice {
    public constructor(message = 'Only the bot owner can use this.') {
        super(message);
    }
}

export class NotInGuild extends GateNotice {
    public constructor(message = 'This can only be used in a server.') {
        super(message);
    }
}

export class NotInDm extends GateNotice {
    public constructor(message = 'This can only be used in a direct message.') {
        super(message);
    }
}

export class NotNsfw extends GateNotice {
    public constructor(message = 'This can only be used in an age-restricted channel.') {
        super(message);
    }
}

export class OnCooldown extends GateNotice {
    public constructor(
        public readonly expires: EpochMs,
        message?: string
    ) {
        super(message ?? `You are doing that too fast. Try again <t:${toEpochSeconds(expires)}:R>.`);
    }
}

export class MissingRole extends GateNotice {
    public constructor(
        message: string | undefined,
        public readonly role: Role | null
    ) {
        super(message ?? (role ? `You need the ${role.name} role to use this.` : 'You do not have the required role.'));
    }
}

// ----- gate combinator refusals -----

export class NotAllowed extends Notice {
    public constructor() {
        super('not allowed');
    }

    public render(): ReplyResponse {
        return { components: [new NoticeCard('You are not allowed to use this command.').component] };
    }
}

export class NeedsAny extends Notice {
    public constructor(private readonly summaries: readonly string[]) {
        super('not allowed');
    }

    public render(): ReplyResponse {
        const bullets = this.summaries.map((summary) => `• ${summary}`).join('\n');
        return { components: [new NoticeCard(`You need any of:\n${bullets}`).component] };
    }
}

// ----- permission refusals -----

export class RoleHigherThanMe extends Notice {
    public constructor(
        message: string,
        public role: Role,
        public botRole: Role
    ) {
        super(message);
    }

    public render(): ReplyResponse {
        const card = new NoticeCard(
            `I cannot assign a role that is higher than me.\n\n` +
                `The role <@&${this.role.id}> is higher than my role <@&${this.botRole.id}> in the hierarchy.`
        );
        return { components: [card.component] };
    }
}

export class CannotAssignBotRole extends Notice {
    public constructor(message = 'I cannot assign a managed role.') {
        super(message);
    }

    public render(): ReplyResponse {
        return { components: [new NoticeCard('I cannot assign a managed role.').component] };
    }
}

export class MissingPermissions extends Notice {
    public constructor(
        message: string,
        public where: PermSubject,
        public missingPerms: string[]
    ) {
        super(message);
    }

    public render(): ReplyResponse {
        const bullets = this.missingPerms.map((perm) => `• ${perm}`).join('\n');
        const card = new NoticeCard(
            `The ${labelFor(this.where)} ${mentionFor(this.where)} is missing the following permission entries:\n\n${bullets}`
        );
        return { components: [card.component] };
    }
}

export class HasDangerousPermissions extends Notice {
    public constructor(
        message: string,
        public target: PermSubject,
        public dangerousPerms: string[]
    ) {
        super(message);
    }

    public render(): ReplyResponse {
        const bullets = this.dangerousPerms.map((perm) => `• ${perm}`).join('\n');
        const card = new NoticeCard(
            `The ${labelFor(this.target)} ${mentionFor(this.target)} has the following permission entries that must not be enabled:\n\n${bullets}`
        );
        return { components: [card.component] };
    }
}

// ----- utility refusals -----

export class UserNotFound extends Notice {
    public constructor(public readonly userArg: string) {
        super(`User not found: ${userArg}`);
    }

    public render(): ReplyResponse {
        const card = new NoticeCard(
            `User probably doesn't exist or was deleted.\n` +
                `**User Argument:** \`${this.userArg}\`\n` +
                `Please check the user ID and try again. Only pass valid user IDs as the argument.`,
            'User Not Found'
        );
        return { components: [card.component] };
    }
}

export class UserNotInGuild extends Notice {
    public constructor(message = 'User is not in the guild.') {
        super(message);
    }

    public render(): ReplyResponse {
        return { components: [new NoticeCard(this.message).component] };
    }
}

export class RoleDoesNotExist extends Notice {
    public constructor(
        message: string,
        public roleId: string
    ) {
        super(message);
    }

    public render(): ReplyResponse {
        return { components: [new NoticeCard(`The role with ID \`${this.roleId}\` does not exist.`).component] };
    }
}

export class CouldNotFindChannel extends Notice {
    public constructor(
        message: string,
        public readonly channelId: string
    ) {
        super(message);
    }

    public render(): ReplyResponse {
        const card = new NoticeCard(
            `Could not find channel with ID \`${this.channelId}\`. It could also be that the channel is not a text channel.`
        );
        return { components: [card.component] };
    }
}
