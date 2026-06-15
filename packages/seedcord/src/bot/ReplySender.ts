import { Logger } from '@seedcord/services';
import { DiscordAPIError } from 'discord.js';

import { HARMLESS_API_CODES } from '@bot/harmlessApiCodes';
import { flagsFor } from '@miscellaneous/flagsFor';

import type { Repliables } from '@handlers/BaseHandler';
import type { ReplyResponse } from '@seedcord/types';
import type { EmbedBuilder, InteractionReplyOptions } from 'discord.js';

type EmbedArm = Extract<ReplyResponse, { kind: 'embed' }>;

/**
 * Sends a {@link ReplyResponse} to an interaction, picking reply, editReply, or followUp from the live
 * acknowledgement state. The single place that picks the reply method, so callers never reimplement it.
 * Logs and drops its own send failures so a dead token never escapes into the controller.
 */
export class ReplySender {
    private readonly logger = new Logger('ReplySender');

    public constructor(private readonly interaction: Repliables) {}

    /**
     * Sends the reply. Never throws, a failed send is logged and dropped.
     *
     * @param response - The embed or ComponentsV2 reply to show.
     * @param ephemeral - Whether the reply is ephemeral. Ignored on a deferred embed edit, where Discord
     *   fixed the ephemeral flag at defer time. Defaults to `true`.
     */
    public async send(response: ReplyResponse, ephemeral = true): Promise<void> {
        try {
            await this.dispatch(response, ephemeral);
        } catch (error) {
            this.logSwallowed('send', error);
        }
    }

    private async dispatch(response: ReplyResponse, ephemeral: boolean): Promise<void> {
        if (this.interaction.replied) {
            await this.interaction.followUp(this.replyOptions(response, ephemeral));
            return;
        }

        if (this.interaction.deferred) {
            // a component or modal may have used deferUpdate(), where @original is the live source message,
            // not a throwaway "thinking" placeholder. editReply would overwrite it and deleteReply would
            // destroy it, so send the error as a fresh followUp and never touch @original.
            if (this.interaction.isMessageComponent() || this.interaction.isModalSubmit()) {
                await this.interaction.followUp(this.replyOptions(response, ephemeral));
                return;
            }
            // editReply cannot upgrade a classic defer to ComponentsV2 (Discord rejects it with 50035), so
            // send a fresh v2 followUp and clear the stale "thinking" defer to leave the user one message.
            if (response.kind === 'v2') {
                await this.interaction.followUp(this.replyOptions(response, ephemeral));
                await this.clearStaleDefer();
                return;
            }
            await this.interaction.editReply(this.embedBody(response));
            return;
        }

        await this.interaction.reply(this.replyOptions(response, ephemeral));
    }

    private replyOptions(response: ReplyResponse, ephemeral: boolean): InteractionReplyOptions {
        if (response.kind === 'v2') {
            return { components: response.components, flags: flagsFor(true, ephemeral) };
        }
        return { ...this.embedBody(response), flags: flagsFor(false, ephemeral) };
    }

    // content is omitted entirely when unset, exactOptionalPropertyTypes rejects content: undefined.
    private embedBody(response: EmbedArm): { embeds: EmbedBuilder[]; content?: string } {
        return response.content === undefined
            ? { embeds: response.embeds }
            : { embeds: response.embeds, content: response.content };
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
