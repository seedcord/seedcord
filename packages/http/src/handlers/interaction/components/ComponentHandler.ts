import { InteractionHandler } from '@handlers/interaction/InteractionHandler';

import type { SentMessage } from '@reply/ReplySender';
import type { ReplyResponse } from '@seedcord/types';
import type { APIMessageComponentInteraction, APIModalSubmitInteraction } from 'discord-api-types/v10';

/**
 * Shared base the component and modal handlers extend.
 *
 * Not a public entry point. Extend {@link ButtonHandler}, {@link SelectMenuHandler}, or {@link ModalHandler}
 * instead. This class adds the source-message verbs `update` and `deferUpdate` on top of the reply members.
 *
 * @typeParam Event - The component or modal interaction type this handler processes
 */
export abstract class ComponentHandler<
    Event extends APIMessageComponentInteraction | APIModalSubmitInteraction
> extends InteractionHandler<Event> {
    /** Rewrite the source message the clicked component is attached to. */
    protected update(response: ReplyResponse | string): Promise<SentMessage> {
        return this.sender.update(response);
    }

    /** Silently acknowledge the component, leaving the source message untouched. */
    protected deferUpdate(): Promise<void> {
        return this.sender.deferUpdate();
    }
}
