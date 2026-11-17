import { RepliableHandler } from '#handlers/RepliableHandler';

import type { Repliables } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { ReplySender } from '#reply/ReplySender';
import type { DispatchContext, ModalLike } from '@seedcord/core';
import type { APIModalSubmitInteraction } from 'discord-api-types/v10';
import type { ExcludeStrict } from 'type-fest';

/**
 * Shared base the repliable interaction handlers extend.
 *
 * For a handler with a route, extend {@link SlashHandler}, {@link ContextMenuHandler},
 * {@link ButtonHandler}, {@link ModalHandler}, or one of the select menu bases. Extend this class
 * directly only for `interactions.unhandled`, which answers every interaction kind. This class adds
 * `showModal` on top of the reply members.
 *
 * @typeParam Event - The repliable interaction type this handler processes
 */
export abstract class InteractionHandler<Event extends Repliables> extends RepliableHandler<Event> {
    // the dispatcher needs a public construct signature, but RepliableHandler's ctor is protected
    constructor(event: Event, core: Core, dispatch: DispatchContext, sender: ReplySender) {
        super(event, core, dispatch, sender);
    }

    /**
     * Open a modal. Must be the initial response to this interaction. The modal kind rejects this call at
     * compile time (Discord forbids a modal in response to a modal).
     */
    protected showModal(
        this: InteractionHandler<ExcludeStrict<Repliables, APIModalSubmitInteraction>>,
        modal: ModalLike
    ): Promise<void> {
        return this.sender.showModal(modal);
    }
}
