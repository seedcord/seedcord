import { RepliableHandler } from '@handlers/RepliableHandler';

import type { Core } from '@interfaces/Core';
import type { DispatchContext } from '@seedcord/core';
import type { ModalLike } from '@seedcord/core/internal';
import type { NonModalInteraction, Repliables } from '@src/handlers/interactionTypes';

/**
 * Shared base the typed interaction handlers extend.
 *
 * Not a public entry point. Extend {@link SlashHandler}, {@link ButtonHandler}, {@link ModalHandler},
 * or {@link SelectMenuHandler} instead. This class adds `showModal` on top of the reply members those bases
 * share.
 *
 * @typeParam Repliable - The interaction type this handler processes
 */
export abstract class InteractionHandler<Repliable extends Repliables> extends RepliableHandler<Repliable> {
    // keep this ctor. it gives typeof InteractionHandler a public construct signature that HandlerConstructor
    // needs, and dropping it (inheriting RepliableHandler's protected ctor) collapses HandlerConstructor to never.
    constructor(event: Repliable, core: Core, dispatch?: DispatchContext) {
        super(event, core, dispatch);
    }

    /**
     * Open a modal. Must be the initial response to this interaction. The modal kind rejects this call at
     * compile time (Discord forbids a modal in response to a modal).
     */
    protected showModal(this: InteractionHandler<NonModalInteraction>, modal: ModalLike): Promise<void> {
        return this.sender.showModal(modal);
    }
}
