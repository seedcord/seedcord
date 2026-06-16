import { defineGate } from '../Gate';
import { GateNotice } from './GateNotice';
import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { Gate, InteractionGateContext, NonModalInteraction } from '../Gate';

/** Refusal shown when a command marked NSFW runs in a channel that is not age-restricted. */
export class NotNsfw extends GateNotice {
    public constructor(message = 'This can only be used in an age-restricted channel.') {
        super(message);
    }
}

// a thread carries no nsfw flag of its own, so it inherits the parent channel's
function channelIsNsfw(channel: InteractionGateContext['interaction']['channel']): boolean {
    if (!channel) return false;
    if (channel.isThread()) return channel.parent?.nsfw ?? false;
    return 'nsfw' in channel ? channel.nsfw : false;
}

/** Requires an age-restricted channel, else refuses with {@link NotNsfw}. ModalSubmit has no reliable channel, so it is excluded. */
export function Nsfw(options?: GateNoticeOptions): Gate<InteractionGateContext<NonModalInteraction>, 'Nsfw'> {
    return defineGate('Nsfw', (ctx: InteractionGateContext<NonModalInteraction>) => {
        if (channelIsNsfw(ctx.interaction.channel)) return;
        throw pickNotice(options, (message) => new NotNsfw(message));
    });
}
