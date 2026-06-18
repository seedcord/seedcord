import { defineGate } from '../Gate';
import { GateNotice } from './GateNotice';
import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { Gate, GateContextBase } from '../Gate';

/**
 * Refusal shown when the caller is not a configured bot owner.
 *
 * @param message - Text shown in the refusal, defaulting to a bot-owner-only line.
 */
export class NotOwner extends GateNotice {
    public constructor(message = 'Only the bot owner can use this.') {
        super(message);
    }
}

/**
 * Refusal shown when a guild-only command runs in a DM.
 *
 * @param message - Text shown in the refusal, defaulting to a server-only line.
 */
export class NotInGuild extends GateNotice {
    public constructor(message = 'This can only be used in a server.') {
        super(message);
    }
}

/**
 * Refusal shown when a DM-only command runs in a guild.
 *
 * @param message - Text shown in the refusal, defaulting to a direct-message-only line.
 */
export class NotInDm extends GateNotice {
    public constructor(message = 'This can only be used in a direct message.') {
        super(message);
    }
}

/**
 * Passes only for a user id listed in `config.ownerIds`, else refuses with an ephemeral {@link NotOwner}.
 *
 * Agnostic, so it attaches to interaction and event handlers alike. With no `ownerIds` configured it refuses every caller. Pass {@link GateNoticeOptions} to reword or replace the refusal.
 *
 * @param options - Reword or replace the refusal. Omit to throw the default {@link NotOwner}.
 *
 * @see {@link Gated}
 *
 * @example
 * ```ts
 * \@Gated(OwnerOnly())
 * \@SlashRoute('shutdown')
 * class ShutdownHandler extends SlashHandler<'shutdown'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 *
 * @example
 * ```ts
 * // reword the refusal, keeping the embed styling
 * OwnerOnly({ message: 'Owners only.' });
 * ```
 */
export function OwnerOnly(options?: GateNoticeOptions): Gate<GateContextBase, 'OwnerOnly'> {
    return defineGate('OwnerOnly', (ctx) => {
        const owners = ctx.core.config.ownerIds ?? [];
        if (ctx.user && owners.includes(ctx.user.id)) return;
        throw pickNotice(options, (message) => new NotOwner(message));
    });
}

/**
 * Passes inside a guild, else refuses with {@link NotInGuild}.
 *
 * Agnostic, so it attaches to any handler kind. Often paired with {@link RequirePermissions} in an {@link and}.
 *
 * @param options - Reword or replace the refusal. Omit to throw the default {@link NotInGuild}.
 *
 * @see {@link Gated}
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 *
 * \@Gated(GuildOnly(), RequirePermissions([PermissionFlagsBits.Administrator]))
 * \@SlashRoute('maintenance')
 * class Maintenance extends SlashHandler<'maintenance'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export function GuildOnly(options?: GateNoticeOptions): Gate<GateContextBase, 'GuildOnly'> {
    return defineGate('GuildOnly', (ctx) => {
        if (ctx.guild) return;
        throw pickNotice(options, (message) => new NotInGuild(message));
    });
}

/**
 * Passes in a direct message, else refuses with {@link NotInDm}.
 *
 * Agnostic, so it attaches to any handler kind. The inverse of {@link GuildOnly}, so combining the two in an {@link and} can never pass.
 *
 * @param options - Reword or replace the refusal. Omit to throw the default {@link NotInDm}.
 *
 * @see {@link Gated}
 *
 * @example
 * ```ts
 * \@Gated(DmOnly())
 * \@SlashRoute('verify')
 * class VerifyHandler extends SlashHandler<'verify'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export function DmOnly(options?: GateNoticeOptions): Gate<GateContextBase, 'DmOnly'> {
    return defineGate('DmOnly', (ctx) => {
        if (!ctx.guild) return;
        throw pickNotice(options, (message) => new NotInDm(message));
    });
}
