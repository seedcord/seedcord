import { defineGate } from '../Gate';
import { GateNotice } from './GateNotice';
import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { Gate, GateContextBase } from '../Gate';

/** Refusal shown when the caller is not a configured bot owner. */
export class NotOwner extends GateNotice {
    public constructor(message = 'Only the bot owner can use this.') {
        super(message);
    }
}

/** Refusal shown when a guild-only command runs in a DM. */
export class NotInGuild extends GateNotice {
    public constructor(message = 'This can only be used in a server.') {
        super(message);
    }
}

/** Refusal shown when a DM-only command runs in a guild. */
export class NotInDm extends GateNotice {
    public constructor(message = 'This can only be used in a direct message.') {
        super(message);
    }
}

/** Passes only for a user id listed in `config.ownerIds`, else refuses with an ephemeral {@link NotOwner}. */
export function OwnerOnly(options?: GateNoticeOptions): Gate<GateContextBase, 'OwnerOnly'> {
    return defineGate('OwnerOnly', (ctx) => {
        const owners = ctx.core.config.ownerIds ?? [];
        if (ctx.user && owners.includes(ctx.user.id)) return;
        throw pickNotice(options, (message) => new NotOwner(message));
    });
}

/** Refuses outside a guild with {@link NotInGuild}. */
export function GuildOnly(options?: GateNoticeOptions): Gate<GateContextBase, 'GuildOnly'> {
    return defineGate('GuildOnly', (ctx) => {
        if (ctx.guild) return;
        throw pickNotice(options, (message) => new NotInGuild(message));
    });
}

/** Refuses inside a guild with {@link NotInDm}. */
export function DmOnly(options?: GateNoticeOptions): Gate<GateContextBase, 'DmOnly'> {
    return defineGate('DmOnly', (ctx) => {
        if (!ctx.guild) return;
        throw pickNotice(options, (message) => new NotInDm(message));
    });
}
