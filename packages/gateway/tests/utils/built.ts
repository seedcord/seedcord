import { autocompleteResponder } from '#bot/autocompleteResponder';
import { ReplySender } from '#bot/ReplySender';
import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { DispatchContext } from '@seedcord/core';
import type { AutocompleteInteraction } from 'discord.js';

// builds what InteractionRun passes as a handler's fourth argument
export function built<Event, ReplyWith, Handler>(
    Ctor: new (event: Event, core: Core, dispatch: DispatchContext, replyWith: ReplyWith) => Handler,
    event: Event,
    core: Core,
    dispatch: DispatchContext
): Handler {
    // justified: the class check picks the event type that Ctor takes
    const replyWith =
        Ctor.prototype instanceof AutocompleteHandler
            ? autocompleteResponder(event as AutocompleteInteraction, core, dispatch)
            : new ReplySender(event as Repliables, dispatch, core.bus);
    return new Ctor(event, core, dispatch, replyWith as ReplyWith);
}
