import { RepliableHandler as CoreRepliableHandler } from '@seedcord/core';

import { ReplySender } from '@reply/ReplySender';

import type { Repliables } from './BaseHandler';
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
    ReplySender
> {
    protected buildSender(event: Event, core: Core, routeId: string): ReplySender {
        const ref = { application_id: event.application_id, id: event.id, token: event.token };
        return new ReplySender(ref, core.rest, routeId);
    }
}
