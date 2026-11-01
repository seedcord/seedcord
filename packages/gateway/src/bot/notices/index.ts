import { Notice } from '@seedcord/core';
import { GateNotice, NoticeCard } from '@seedcord/core/internal';

import type { ReplyResponse } from '@seedcord/types';
import type { Role } from 'discord.js';

export class NotNsfw extends GateNotice {
    public constructor() {
        super('This can only be used in an age-restricted channel.');
        this.summary = 'be in an age-restricted channel';
    }
}

export class RoleHigherThanMe extends Notice {
    public constructor(
        public readonly role: Role,
        public readonly botRole: Role
    ) {
        super('Role is higher than me');
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
    public constructor(public readonly role: Role) {
        super(`Cannot assign managed role ${role.name}`);
    }

    public render(): ReplyResponse {
        return { components: [new NoticeCard(`I cannot assign <@&${this.role.id}>, a managed role.`).component] };
    }
}
