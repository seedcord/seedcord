import { ComponentKindBrand } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { ComponentHandler } from './ComponentHandler';

import type { SentMessage } from '#bot/ReplySender';
import type { GatewayReplyResponse } from '#interfaces/ReplyResponse';
import type { AnyCustomId } from '@seedcord/core/internal';
import type { CacheType, ModalSubmitFields, ModalSubmitInteraction } from 'discord.js';

/**
 * Base class for a modal submit handler.
 *
 * Register the customId definitions this handler decodes with `@ModalRoute`, list the same ones in the
 * generic, then read `this.params` for a single route or `this.match` for several. Read the submitted
 * inputs from `this.fields`. Reply through the handler members. `showModal` fails compilation on this kind,
 * because Discord forbids opening a modal in response to a modal.
 *
 * @typeParam Defs - The customId definitions this handler decodes, e.g. `[typeof ConfigId]`.
 * @typeParam Cache - The interaction cache state, `'cached'` by default.
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
export abstract class ModalHandler<
    Defs extends readonly AnyCustomId[],
    Cache extends CacheType = 'cached'
> extends ComponentHandler<ModalSubmitInteraction<Cache>, Defs> {
    // phantom, never set at runtime.
    /** @internal */
    declare readonly [ComponentKindBrand]?: 'modal';

    /** The fields this modal submitted, read by custom id. */
    protected get fields(): ModalSubmitFields {
        return this.event.fields;
    }

    /** Rewrite the message this modal was opened from. Throws when a command opened the modal. */
    protected override update(response: GatewayReplyResponse | string): Promise<SentMessage> {
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
        if (this.event.isFromMessage()) return;
        throw new SeedcordError(SeedcordErrorCode.ReplyUpdateWithoutSource, [method, this.routeId]);
    }
}
