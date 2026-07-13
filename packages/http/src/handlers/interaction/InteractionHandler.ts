import { RepliableHandler } from '@handlers/RepliableHandler';

import type { Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { ModalLike } from '@reply/ReplySender';
import type { DispatchContext } from '@seedcord/core';

/**
 * Shared base the non-modal repliable handlers extend.
 *
 * Not a public entry point. Extend {@link SlashHandler}, {@link ContextMenuHandler}, {@link ButtonHandler},
 * or {@link SelectMenuHandler} instead. This class adds `showModal` on top of the reply members.
 *
 * @typeParam Event - The repliable interaction type this handler processes
 */
export abstract class InteractionHandler<Event extends Repliables> extends RepliableHandler<Event> {
    // the dispatcher needs a public construct signature, RepliableHandler's ctor is protected
    constructor(event: Event, core: Core, dispatch?: DispatchContext) {
        super(event, core, dispatch);
    }

    /** Open a modal. Must be the initial response to this interaction. */
    protected showModal(modal: ModalLike): Promise<void> {
        return this.sender.showModal(modal);
    }
}
