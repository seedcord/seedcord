import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ComponentHandler } from './ComponentHandler';

import type { SentMessage } from '@reply/ReplySender';
import type { AnyCustomId } from '@seedcord/core/internal';
import type { ReplyResponse } from '@seedcord/types';
import type { APIModalSubmitInteraction } from 'discord-api-types/v10';

/**
 * Base class for a modal submit handler on the HTTP transport.
 *
 * Register the customId definitions this handler decodes with `@ModalRoute` and list the same ones in the
 * generic. Read the submitted inputs off `this.event.data.components`. Reply through the handler members.
 * Discord forbids opening a modal in response to a modal, so `showModal` fails compilation on this kind.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ConfigId]`.
 */
export abstract class ModalHandler<Defs extends readonly AnyCustomId[]> extends ComponentHandler<
    APIModalSubmitInteraction,
    Defs
> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly __component?: 'modal';

    /** Rewrite the message this modal was opened from (only when a component opened it). */
    protected override update(response: ReplyResponse | string): Promise<SentMessage> {
        this.ensureSourceMessage('update');
        return super.update(response);
    }

    /** Silently acknowledge, leaving the source message untouched. */
    protected override deferUpdate(): Promise<void> {
        this.ensureSourceMessage('deferUpdate');
        return super.deferUpdate();
    }

    // discord omits message when a command opened the modal, the source verbs have no target then
    private ensureSourceMessage(method: string): void {
        if (this.event.message) return;
        throw new SeedcordError(SeedcordErrorCode.ReplyUpdateWithoutSource, [method, this.routeId]);
    }
}
