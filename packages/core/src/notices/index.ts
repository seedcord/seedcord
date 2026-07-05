import { toEpochSeconds } from '@seedcord/utils';

import { Notice } from '@stops/Notice';
import { NoticeCard } from '@stops/NoticeCard';

import type { EpochMs, ReplyResponse } from '@seedcord/types';

export abstract class GateNotice extends Notice {
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

export class OnCooldown extends GateNotice {
    public constructor(
        public readonly resetAt: EpochMs,
        message?: string
    ) {
        super(message ?? `You are doing that too fast. Try again <t:${toEpochSeconds(resetAt)}:R>.`);
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
