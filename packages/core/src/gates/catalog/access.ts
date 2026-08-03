import { defineGate } from '@gates/Gate';
import { NotInDm, NotInGuild, NotOwner } from '@notices/index';

import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { Gate, GateContextBase } from '@gates/Gate';

/**
 * Passes only for a user id listed in `config.ownerIds`, else refuses.
 *
 * Agnostic, so it attaches to interaction and event handlers alike. With no `ownerIds` configured it refuses every caller. Pass {@link GateNoticeOptions} to reword or replace the refusal.
 *
 * @param options - Reword the default refusal with `message`, or replace it with `notice`.
 *
 * @see the `@Gated` decorator from `seedcord`
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
        if (ctx.userId !== null && owners.includes(ctx.userId)) return;
        throw pickNotice(options, (message) => new NotOwner(message));
    });
}

/**
 * Passes inside a guild, else refuses.
 *
 * Agnostic, so it attaches to any handler kind. Often paired with `RequirePermissions` in an {@link and}.
 *
 * @param options - Reword the default refusal with `message`, or replace it with `notice`.
 *
 * @see the `@Gated` decorator from `seedcord`
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
        if (ctx.guildId) return;
        throw pickNotice(options, (message) => new NotInGuild(message));
    });
}

/**
 * Passes in a direct message, else refuses.
 *
 * Agnostic, so it attaches to any handler kind. The inverse of {@link GuildOnly}, so combining the two in an {@link and} can never pass.
 *
 * @param options - Reword the default refusal with `message`, or replace it with `notice`.
 *
 * @see the `@Gated` decorator from `seedcord`
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
        if (!ctx.guildId) return;
        throw pickNotice(options, (message) => new NotInDm(message));
    });
}
