import { Logger } from '@seedcord/services';
import { DiscordAPIError, MessageFlags } from 'discord.js';

import { HARMLESS_API_CODES } from '@bot/harmlessApiCodes';
import { flagsFor } from '@miscellaneous/flagsFor';

import type { Repliables } from '@handlers/BaseHandler';
import type { ReplyResponse } from '@seedcord/types';
import type { InteractionReplyOptions, Message, WebhookMessageEditOptions } from 'discord.js';

/**
 * Sends a {@link ReplyResponse} to an interaction, picking reply, editReply, or followUp from the live
 * acknowledgement state. Logs and drops its own send failures so a dead token never escapes into the
 * controller.
 */
export class ReplySender {
    private readonly logger = new Logger('ReplySender');

    public constructor(private readonly interaction: Repliables) {}

    /**
     * Sends the reply and returns the sent message so a caller can attach a collector to it. Never throws,
     * a failed send is logged and dropped and resolves to `undefined`.
     *
     * @param response - The ComponentsV2 reply to show.
     * @param ephemeral - Whether the reply is ephemeral. {@default `true`}
     * @returns The sent {@link Message}, or `undefined` when the send was swallowed.
     */
    public async send(response: ReplyResponse, ephemeral = true): Promise<Message | undefined> {
        try {
            return await this.dispatch(response, ephemeral);
        } catch (error) {
            this.logSwallowed('send', error);
            return undefined;
        }
    }

    /**
     * Edits an already-sent message to a new {@link ReplyResponse}. Used to swap a confirmation prompt for
     * its outcome. Never throws, a failed edit is logged and dropped.
     *
     * @param message - The message to edit (the handle a prior {@link send} returned).
     * @param response - The reply to replace it with.
     */
    public async edit(message: Message, response: ReplyResponse): Promise<void> {
        try {
            await this.interaction.webhook.editMessage(message, this.editBody(response));
        } catch (error) {
            this.logSwallowed('edit', error);
        }
    }

    private async dispatch(response: ReplyResponse, ephemeral: boolean): Promise<Message> {
        if (this.interaction.replied) {
            return await this.interaction.followUp(this.replyOptions(response, ephemeral));
        }

        if (this.interaction.deferred) {
            const message = await this.interaction.followUp(this.replyOptions(response, ephemeral));
            // a component/modal deferUpdate left @original as the live source message, leave it untouched.
            // a slash deferReply left a throwaway "thinking" placeholder, clear it so the user sees one
            // message. editReply cannot turn a classic "thinking" defer into ComponentsV2 (Discord rejects
            // it with 50035), which is why this path follows up and deletes rather than editing.
            if (!this.interaction.isMessageComponent() && !this.interaction.isModalSubmit()) {
                await this.clearStaleDefer();
            }
            return message;
        }

        await this.interaction.reply(this.replyOptions(response, ephemeral));
        // reply() resolves to an InteractionResponse, fetchReply() is the message the collector attaches to.
        return await this.interaction.fetchReply();
    }

    private replyOptions(response: ReplyResponse, ephemeral: boolean): InteractionReplyOptions {
        return { components: response.components, flags: flagsFor(ephemeral) };
    }

    private editBody(response: ReplyResponse): WebhookMessageEditOptions {
        return { components: response.components, flags: MessageFlags.IsComponentsV2 };
    }

    private async clearStaleDefer(): Promise<void> {
        try {
            await this.interaction.deleteReply();
        } catch (error) {
            this.logSwallowed('clear stale defer', error);
        }
    }

    private logSwallowed(action: string, error: unknown): void {
        if (error instanceof DiscordAPIError && HARMLESS_API_CODES.has(error.code)) {
            this.logger.debug(`reply ${action} hit harmless code ${error.code}`);
            return;
        }
        this.logger.error(`reply ${action} failed`, error);
    }
}
