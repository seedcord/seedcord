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
    public constructor() {
        super('Only the bot owner can use this.');
        this.summary = 'be the bot owner';
    }
}

export class NotInGuild extends GateNotice {
    public constructor() {
        super('This can only be used in a server.');
        this.summary = 'be in a server';
    }
}

export class NotInDm extends GateNotice {
    public constructor() {
        super('This can only be used in a direct message.');
        this.summary = 'be in a direct message';
    }
}

function retryAt(resetAt: EpochMs): string {
    return `<t:${toEpochSeconds(resetAt)}:R>`;
}

export class OnCooldown extends GateNotice {
    public constructor(public readonly resetAt: EpochMs) {
        super(`You are doing that too fast. Try again ${retryAt(resetAt)}.`);
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
        // two gates in an or can refuse with the same summary
        this.summaries = [...new Set(summaries)];
    }

    public render(): ReplyResponse {
        const bullets = this.summaries.map((summary) => `• ${summary}`).join('\n');
        return { components: [new NoticeCard(`You need to meet at least one of these:\n${bullets}`).component] };
    }
}

export class MissingRole extends GateNotice {
    public constructor(roleId: string) {
        super(`You need the <@&${roleId}> role to use this.`);
        this.summary = `hold the <@&${roleId}> role`;
    }
}

export class PermissionsUnresolved extends GateNotice {
    public constructor() {
        super('Your server member data could not be resolved. Try again.');
    }
}

abstract class PermissionListNotice extends Notice {
    protected constructor(
        message: string,
        private readonly lead: string,
        private readonly permissions: readonly string[]
    ) {
        super(message);
    }

    public render(): ReplyResponse {
        const bullets = this.permissions.map((perm) => `• ${perm}`).join('\n');
        return { components: [new NoticeCard(`${this.lead}\n${bullets}`).component] };
    }
}

// a null subject is the caller
export class MissingPermissions extends PermissionListNotice {
    public constructor(subject: string | null, permissions: readonly string[]) {
        const who = subject === null ? 'You are' : `${subject} is`;
        super('A required permission is missing.', `${who} missing the following permission entries:`, permissions);
        const names = permissions.join(', ');
        this.summary = subject === null ? `hold ${names}` : `${subject} needs ${names}`;
    }
}

export class HasPresentPermissions extends PermissionListNotice {
    public constructor(subject: string | null, permissions: readonly string[]) {
        const who = subject === null ? 'You hold' : `${subject} holds`;
        super('A refused permission is held.', `${who} permissions this command refuses:`, permissions);
        const names = permissions.join(', ');
        this.summary = subject === null ? `not hold ${names}` : `${subject} must not hold ${names}`;
    }
}
