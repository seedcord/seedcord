import { Notice } from '@seedcord/core';
import { GateNotice, NoticeCard } from '@seedcord/core/internal';

import type { ReplyResponse } from '@seedcord/types';
import type { Role } from 'discord.js';

export class NotNsfw extends GateNotice {
    public constructor(message = 'This can only be used in an age-restricted channel.') {
        super(message);
        this.summary = 'be in an age-restricted channel';
    }
}

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
