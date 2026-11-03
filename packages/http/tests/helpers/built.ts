import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { autocompleteResponder } from '#reply/autocompleteResponder';
import { ReplySender } from '#reply/ReplySender';

import type { Repliables } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { DispatchContext } from '@seedcord/core';
import type { APIInteraction } from 'discord-api-types/v10';

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
            ? autocompleteResponder(event as APIInteraction, core, dispatch)
            : new ReplySender(event as Repliables, core.rest, dispatch, core.bus);
    return new Ctor(event, core, dispatch, replyWith as ReplyWith);
}
