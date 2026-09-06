import { ComponentKindBrand } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ModalFields } from '#inputs/ModalFields';

import { ComponentHandler } from './ComponentHandler';

import type { SentMessage } from '#reply/ReplySender';
import type { InteractionKind } from '@seedcord/core';
import type { AnyCustomId } from '@seedcord/custom-id';
import type { ReplyResponse } from '@seedcord/types';
import type { APIModalSubmitInteraction } from 'discord-api-types/v10';

/**
 * Base class for a modal submit handler on the HTTP transport.
 *
 * Register the customId definitions this handler decodes with `@ModalRoute` and list the same ones in the
 * generic. Read the submitted inputs from `this.fields`. Reply through the handler members. `showModal`
 * fails compilation on this kind, because Discord forbids opening a modal in response to a modal.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ConfigId]`.
 *
 * @example
 * ```ts
 * \@ModalRoute(ConfigId)
 * class ConfigModal extends ModalHandler<[typeof ConfigId]> {
 *     async execute() {
 *         const { guildId } = this.params;
 *         const name = this.fields.getTextInputValue('name');
 *         await this.reply(`saved ${name} for ${guildId}`);
 *     }
 * }
 * ```
 */
export abstract class ModalHandler<Defs extends readonly AnyCustomId[]> extends ComponentHandler<
    APIModalSubmitInteraction,
    Defs
> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: InteractionKind.Modal;

    private reader?: ModalFields;

    /** The fields this modal submitted, read by custom id. */
    protected get fields(): ModalFields {
        this.reader ??= new ModalFields(this.event.data);
        return this.reader;
    }

    /** Rewrite the message this modal was opened from. Throws when a command opened the modal. */
    protected override update(response: ReplyResponse | string): Promise<SentMessage> {
        this.ensureSourceMessage('update');
        return super.update(response);
    }

    /** Acknowledge the submit without changing the source message. Throws when a command opened the modal. */
    protected override deferUpdate(): Promise<void> {
        this.ensureSourceMessage('deferUpdate');
        return super.deferUpdate();
    }

    // discord omits the message when a command opened the modal
    private ensureSourceMessage(method: string): void {
        if (this.event.message) return;
        throw new SeedcordError(SeedcordErrorCode.ReplyUpdateWithoutSource, [method, this.routeId]);
    }
}
