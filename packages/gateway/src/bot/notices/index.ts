import { Notice } from '@seedcord/core';
import { GateNotice, NoticeCard } from '@seedcord/core/internal';

import type { ReplyResponse } from '@seedcord/types';
import type { Role } from 'discord.js';

// ----- catalog gate refusals -----

export class NotNsfw extends GateNotice {
    public constructor(message = 'This can only be used in an age-restricted channel.') {
        super(message);
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
