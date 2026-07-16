import { RepliableHandler } from '@handlers/RepliableHandler';

import type { Repliables } from '@handlers/interactionTypes';
import type { Core } from '@interfaces/Core';
import type { DispatchContext } from '@seedcord/core';
import type { ModalLike } from '@seedcord/core/internal';
import type { APIModalSubmitInteraction } from 'discord-api-types/v10';

/**
 * Shared base the repliable interaction handlers extend.
 *
 * Not a public entry point. Extend {@link SlashHandler}, {@link ContextMenuHandler}, {@link ButtonHandler},
 * {@link SelectMenuHandler}, or {@link ModalHandler} instead. This class adds `showModal` on top of the
 * reply members.
 *
 * @typeParam Event - The repliable interaction type this handler processes
 */
export abstract class InteractionHandler<Event extends Repliables> extends RepliableHandler<Event> {
    // the dispatcher needs a public construct signature, RepliableHandler's ctor is protected
    constructor(event: Event, core: Core, dispatch?: DispatchContext) {
        super(event, core, dispatch);
    }

    /**
     * Open a modal. Must be the initial response to this interaction. The modal kind rejects this call at
     * compile time (Discord forbids a modal in response to a modal).
     */
    protected showModal(
        this: InteractionHandler<Exclude<Repliables, APIModalSubmitInteraction>>,
        modal: ModalLike
    ): Promise<void> {
        return this.sender.showModal(modal);
    }
}
