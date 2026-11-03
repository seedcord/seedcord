import { RepliableHandler as CoreRepliableHandler } from '@seedcord/core';

import type { ReplySender, SentMessage } from '#bot/ReplySender';
import type { Core } from '#interfaces/Core';
import type { GatewayFile } from '#interfaces/ReplyResponse';
import type { Repliables } from './interactionTypes';
import type { User } from 'discord.js';

/**
 * Shared base the repliable interaction handlers extend.
 *
 * Not a public entry point. Extend {@link SlashHandler}, {@link ButtonHandler}, {@link ModalHandler},
 * {@link ContextMenuHandler}, or one of the select menu bases instead. This class binds the core
 * reply base to the gateway sender.
 *
 * @typeParam Event - The repliable interaction type this handler processes
 */
export abstract class RepliableHandler<Event extends Repliables> extends CoreRepliableHandler<
    Event,
    Core,
    SentMessage,
    GatewayFile,
    ReplySender
> {
    // this chain skips gateway BaseHandler, the only class that defines getEvent
    /** @internal */
    public getEvent(): Event {
        return this.event;
    }

    /** The user who sent this interaction. */
    protected get user(): User {
        return this.event.user;
    }
}
