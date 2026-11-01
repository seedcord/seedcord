import { toEpochSeconds } from '@seedcord/utils';

import { Notice } from '#stops/Notice';
import { NoticeCard } from '#stops/NoticeCard';

import type { EpochMs, ReplyResponse } from '@seedcord/types';

export class NotOwner extends Notice {
    public constructor() {
        super('Only the bot owner can use this.');
        this.summary = 'be the bot owner';
    }
}

export class NotInGuild extends Notice {
    public constructor() {
        super('This can only be used in a server.');
        this.summary = 'be in a server';
    }
}

export class NotInDm extends Notice {
    public constructor() {
        super('This can only be used in a direct message.');
        this.summary = 'be in a direct message';
    }
}

function retryAt(resetAt: EpochMs): string {
    return `<t:${toEpochSeconds(resetAt)}:R>`;
}

export class OnCooldown extends Notice {
    public constructor(public readonly resetAt: EpochMs) {
        super(`You are doing that too fast. Try again ${retryAt(resetAt)}.`);
        this.summary = `try again ${retryAt(resetAt)}`;
    }
}

export class NotAllowed extends Notice {
    public constructor() {
        super('not allowed');
    }

    public override render(): ReplyResponse {
        return { components: [new NoticeCard('You are not allowed to use this command.').component] };
    }
}

export class NeedsAny extends Notice {
    private readonly summaries: readonly string[];

    public constructor(summaries: readonly string[]) {
        super('not allowed');
        // two gates in an or can refuse with the same summary
        this.summaries = [...new Set(summaries)];
    }

    public override render(): ReplyResponse {
        const bullets = this.summaries.map((summary) => `• ${summary}`).join('\n');
        return { components: [new NoticeCard(`You need to meet at least one of these:\n${bullets}`).component] };
    }
}

export class MissingRole extends Notice {
    public constructor(roleId: string) {
        super(`You need the <@&${roleId}> role to use this.`);
        this.summary = `hold the <@&${roleId}> role`;
    }
}

export class PermissionsUnresolved extends Notice {
    public constructor() {
        super('Your server member data could not be resolved. Try again.');
    }
}

interface Wording {
    lead: string;
    summary: string;
}

interface ListWording {
    caller: Wording;
    subject: Wording;
}

abstract class PermissionListNotice extends Notice {
    private readonly lead: string;

    protected constructor(
        message: string,
        subject: string | null,
        private readonly permissions: readonly string[],
        wording: ListWording
    ) {
        super(message);
        const [prefix, words] = subject === null ? ['', wording.caller] : [`${subject} `, wording.subject];
        this.lead = `${prefix}${words.lead}`;
        this.summary = `${prefix}${words.summary} ${permissions.join(', ')}`;
    }

    public override render(): ReplyResponse {
        const bullets = this.permissions.map((perm) => `• ${perm}`).join('\n');
        return { components: [new NoticeCard(`${this.lead}\n${bullets}`).component] };
    }
}

export class MissingPermissions extends PermissionListNotice {
    public constructor(subject: string | null, permissions: readonly string[]) {
        super('A required permission is missing.', subject, permissions, {
            caller: { lead: 'You are missing the following permission entries:', summary: 'hold' },
            subject: { lead: 'is missing the following permission entries:', summary: 'needs' }
        });
    }
}

export class HasPresentPermissions extends PermissionListNotice {
    public constructor(subject: string | null, permissions: readonly string[]) {
        super('A refused permission is held.', subject, permissions, {
            caller: { lead: "You hold permissions that aren't allowed here:", summary: 'not hold' },
            subject: { lead: "holds permissions that aren't allowed here:", summary: 'must not hold' }
        });
    }
}
