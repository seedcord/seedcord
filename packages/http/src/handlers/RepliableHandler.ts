import { RepliableHandler as CoreRepliableHandler } from '@seedcord/core';

import { apiFor } from '#src/api';

import { interactionUser } from './interactionUser';

import type { Core } from '#interfaces/Core';
import type { ReplySender, SentMessage } from '#reply/ReplySender';
import type { Repliables } from './interactionTypes';
import type { API } from '@discordjs/core/http-only';
import type { APIUser } from 'discord-api-types/v10';

/**
 * Shared base the repliable HTTP interaction handlers extend.
 *
 * Not a public entry point. Extend {@link SlashHandler}, {@link ButtonHandler}, {@link ModalHandler},
 * {@link ContextMenuHandler}, or one of the select menu bases instead. This class binds the core
 * reply base to the http sender.
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

    /** The user who sent this interaction, read from `member.user` in a guild and `user` in a DM. */
    protected get user(): APIUser {
        return interactionUser(this.event);
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
