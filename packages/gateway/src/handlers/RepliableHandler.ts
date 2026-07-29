import { RepliableHandler as CoreRepliableHandler } from '@seedcord/core';

import { ReplySender } from '@bot/ReplySender';

import type { Repliables } from './interactionTypes';
import type { SentMessage } from '@bot/ReplySender';
import type { Core } from '@interfaces/Core';

/**
 * Shared base the repliable interaction handlers extend.
 *
 * Not a public entry point. Extend {@link SlashHandler}, {@link ButtonHandler}, {@link ModalHandler},
 * {@link SelectMenuHandler}, or {@link ContextMenuHandler} instead. This class binds the core reply base
 * to the gateway sender.
 *
 * @typeParam Event - The repliable interaction type this handler processes
 */
export abstract class RepliableHandler<Event extends Repliables> extends CoreRepliableHandler<
    Event,
    Core,
    SentMessage,
    ReplySender
> {
    // this chain skips gateway BaseHandler, the only class that defines getEvent, so it re-declares here
    /** @internal */
    public getEvent(): Event {
        return this.event;
    }

    protected buildSender(event: Event, core: Core, routeId: string): ReplySender {
        return new ReplySender(event, routeId, core.bus);
    }
}
