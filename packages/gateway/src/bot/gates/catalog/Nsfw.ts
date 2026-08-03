import { defineGate } from '@seedcord/core';
import { pickNotice } from '@seedcord/core/internal';

import { NotNsfw } from '@bot/notices';

import type { InteractionGateContext } from '../Gate';
import type { Gate, GateNoticeOptions } from '@seedcord/core';
import type { NonModalInteraction } from '@src/handlers/interactionTypes';

// a thread carries no nsfw flag of its own, so it inherits the parent channel's
function channelIsNsfw(channel: InteractionGateContext['interaction']['channel']): boolean {
    if (!channel) return false;
    if (channel.isThread()) return channel.parent?.nsfw ?? false;
    return 'nsfw' in channel ? channel.nsfw : false;
}

/**
 * Requires an age-restricted channel, else refuses. Pass {@link GateNoticeOptions} to reword or replace the refusal.
 *
 * A thread inherits its parent channel's nsfw flag. ModalSubmit has no reliable channel, so it is excluded.
 *
 * @param options - Reword the default refusal with `message`, or replace it with `notice`.
 *
 * @see {@link Gated}
 *
 * @example
 * ```ts
 * \@Gated(Nsfw())
 * \@SlashRoute('nsfwcmd')
 * class NsfwHandler extends SlashHandler<'nsfwcmd'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export function Nsfw(options?: GateNoticeOptions): Gate<InteractionGateContext<NonModalInteraction>, 'Nsfw'> {
    return defineGate('Nsfw', (ctx: InteractionGateContext<NonModalInteraction>) => {
        if (channelIsNsfw(ctx.interaction.channel)) return;
        throw pickNotice(options, (message) => new NotNsfw(message));
    });
}
