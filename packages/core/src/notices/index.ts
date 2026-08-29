import { toEpochSeconds } from '@seedcord/utils';

import { Notice } from '#stops/Notice';
import { NoticeCard } from '#stops/NoticeCard';

import type { EpochMs, ReplyResponse } from '@seedcord/types';

export abstract class GateNotice extends Notice {
    public render(): ReplyResponse {
        return { components: [new NoticeCard(this.message).component] };
    }
}

export class NotOwner extends GateNotice {
    public constructor(message = 'Only the bot owner can use this.') {
        super(message);
        this.summary = 'be the bot owner';
    }
}

export class NotInGuild extends GateNotice {
    public constructor(message = 'This can only be used in a server.') {
        super(message);
        this.summary = 'be in a server';
    }
}

export class NotInDm extends GateNotice {
    public constructor(message = 'This can only be used in a direct message.') {
        super(message);
        this.summary = 'be in a direct message';
    }
}

function retryAt(resetAt: EpochMs): string {
    return `<t:${toEpochSeconds(resetAt)}:R>`;
}

export class OnCooldown extends GateNotice {
    public constructor(
        public readonly resetAt: EpochMs,
        message?: string
    ) {
        super(message ?? `You are doing that too fast. Try again ${retryAt(resetAt)}.`);
        this.summary = `try again ${retryAt(resetAt)}`;
    }
}

export class NotAllowed extends Notice {
    public constructor() {
        super('not allowed');
    }

    public render(): ReplyResponse {
        return { components: [new NoticeCard('You are not allowed to use this command.').component] };
    }
}

export class NeedsAny extends Notice {
    private readonly summaries: readonly string[];

    public constructor(summaries: readonly string[]) {
        super('not allowed');
        // two arms can refuse with the same summary
        this.summaries = [...new Set(summaries)];
    }

    public render(): ReplyResponse {
        const bullets = this.summaries.map((summary) => `• ${summary}`).join('\n');
        return { components: [new NoticeCard(`You need to meet at least one of these:\n${bullets}`).component] };
    }
}

export class MissingRole extends GateNotice {
    public constructor(message: string | undefined, roleId: string | null) {
        super(
            message ?? (roleId ? `You need the <@&${roleId}> role to use this.` : 'You do not have the required role.')
        );
        this.summary = roleId ? `hold the <@&${roleId}> role` : 'hold the required role';
    }
}

export class MissingPermissions extends Notice {
    private readonly customLead: string | undefined;

    public constructor(
        message: string | undefined,
        private readonly subject: string | null,
        private readonly missingPerms: readonly string[]
    ) {
        super(message ?? 'A required permission is missing.');
        this.customLead = message;
        const names = missingPerms.join(', ');
        this.summary = subject === null ? `hold ${names}` : `${subject} needs ${names}`;
    }

    public render(): ReplyResponse {
        const bullets = this.missingPerms.map((perm) => `• ${perm}`).join('\n');
        const lead =
            this.customLead ??
            `${this.subject === null ? 'You are' : `${this.subject} is`} missing the following permission entries:`;
        return {
            components: [new NoticeCard(`${lead}\n\n${bullets}`).component]
        };
    }
}

export class HasDangerousPermissions extends Notice {
    private readonly customLead: string | undefined;

    public constructor(
        message: string | undefined,
        private readonly subject: string,
        private readonly dangerousPerms: readonly string[]
    ) {
        super(message ?? 'A dangerous permission is enabled.');
        this.customLead = message;
        this.summary = `${subject} must not hold ${dangerousPerms.join(', ')}`;
    }

    public render(): ReplyResponse {
        const bullets = this.dangerousPerms.map((perm) => `• ${perm}`).join('\n');
        const lead =
            this.customLead ?? `${this.subject} has the following permission entries that must not be enabled:`;
        return { components: [new NoticeCard(`${lead}\n\n${bullets}`).component] };
    }
}
