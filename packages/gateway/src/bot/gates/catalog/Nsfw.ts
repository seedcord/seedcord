import { defineGate } from '@seedcord/core';

import { NotNsfw } from '#bot/notices/index';

import type { InteractionGateContext } from '#bot/gates/Gate';
import type { NonModalInteraction } from '#src/handlers/interactionTypes';
import type { Gate, GateNoticeOptions } from '@seedcord/core';

// a thread carries no nsfw flag of its own
function channelIsNsfw(channel: InteractionGateContext['interaction']['channel']): boolean {
    if (!channel) return false;
    if (channel.isThread()) return channel.parent?.nsfw ?? false;
    return 'nsfw' in channel ? channel.nsfw : false;
}

/**
 * Requires an age-restricted channel, else refuses. Pass a Notice class as `notice` to replace the refusal.
 *
 * A thread inherits its parent channel's nsfw flag. ModalSubmit has no reliable channel, so it is excluded.
 *
 * @param options - Replace the refusal with a Notice class as `notice`.
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
        throw new (options?.notice ?? NotNsfw)();
    });
}
