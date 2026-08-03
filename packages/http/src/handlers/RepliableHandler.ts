import { RepliableHandler as CoreRepliableHandler } from '@seedcord/core';

import { ReplySender } from '@reply/ReplySender';
import { apiFor } from '@src/api';

import type { Repliables } from './interactionTypes';
import type { API } from '@discordjs/core/http-only';
import type { Core } from '@interfaces/Core';
import type { SentMessage } from '@reply/ReplySender';

/**
 * Shared base the repliable HTTP interaction handlers extend.
 *
 * Not a public entry point. Extend {@link SlashHandler}, {@link ButtonHandler}, {@link ModalHandler},
 * {@link SelectMenuHandler}, or {@link ContextMenuHandler} instead. This class binds the core reply base
 * to the http sender.
 *
 * @typeParam Event - The repliable interaction type this handler processes
 */
export abstract class RepliableHandler<Event extends Repliables> extends CoreRepliableHandler<
    Event,
    Core,
    SentMessage,
    never,
    ReplySender
> {
    // core's base keeps event protected, and Paginator.start reads it from outside the class
    /** @internal */
    public getEvent(): Event {
        return this.event;
    }

    protected buildSender(event: Event, core: Core, routeId: string): ReplySender {
        const ref = { application_id: event.application_id, id: event.id, token: event.token };
        return new ReplySender(ref, core.rest, routeId, core.bus);
    }

    /**
     * Typed Discord REST API (`@discordjs/core/http-only`) over `core.rest`, one instance per core.
     * The interaction callbacks on `api.interactions` bypass the reply surface. The
     * `no-raw-interaction-acks` rule flags them in handler classes.
     */
    protected get api(): API {
        return apiFor(this.core.rest);
    }
}
