import { BaseReplySender, deferFlags, sendFlags } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { MessageFlags } from 'discord.js';

import type { Bus } from '@seedcord/core';
import type { AckState } from '@seedcord/core/internal';
import type { DeferOpts, ReplyResponse, SendOpts } from '@seedcord/types';
import type { Repliables } from '@src/handlers/interactionTypes';
import type {
    APIModalInteractionResponseCallbackData,
    InteractionCallbackResponse,
    InteractionReplyOptions,
    InteractionUpdateOptions,
    MessageComponentInteraction,
    ModalMessageModalSubmitInteraction,
    Message,
    WebhookMessageEditOptions
} from 'discord.js';

// the two djs kinds carrying a source message, so update / deferUpdate have a target
type SourceInteraction = MessageComponentInteraction | ModalMessageModalSubmitInteraction;

/** The created message a gateway reply resolves to. */
export type SentMessage = Message;

// djs flips `replied` on editReply, so per-call derivation would break repeated update() and post-edit
// send() parity
function seedState(interaction: Repliables): AckState {
    if (interaction.deferred && interaction.ephemeral === null) return 'deferred-update';
    if (interaction.replied) return 'replied';
    if (interaction.deferred) return 'deferred-reply';
    return 'unacked';
}

/**
 * Writes interaction responses through the discord.js interaction. Construction is internal to the repliable
 * handler bases and the dispatcher.
 */
export class ReplySender extends BaseReplySender<SentMessage> {
    public constructor(
        private readonly interaction: Repliables,
        routeId: string,
        bus?: Bus
    ) {
        super(routeId, seedState(interaction), bus && { bus, interactionId: interaction.id });
    }

    protected async writeReply(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage | undefined> {
        const result = await this.interaction.reply({
            ...this.replyOptions(response, sendFlags(opts)),
            withResponse: true
        });
        return this.createdMessage(result);
    }

    protected async writeDefer(opts?: DeferOpts): Promise<void> {
        await this.interaction.deferReply({ flags: deferFlags(opts) });
    }

    protected async writeDeferUpdate(): Promise<void> {
        await this.sourceInteraction('deferUpdate').deferUpdate();
    }

    protected async writeUpdate(response: ReplyResponse | string): Promise<SentMessage | undefined> {
        const source = this.sourceInteraction('update');
        const result = await source.update({ ...this.updateOptions(response), withResponse: true });
        return this.createdMessage(result);
    }

    protected async writeFollowUp(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        return await this.interaction.followUp(this.replyOptions(response, sendFlags(opts)));
    }

    protected async writeEditOriginal(response: ReplyResponse | string): Promise<SentMessage> {
        return await this.interaction.editReply(this.editOptions(response));
    }

    protected async writeEditTarget(targetId: string, response: ReplyResponse | string): Promise<SentMessage> {
        return await this.interaction.webhook.editMessage(targetId, this.editOptions(response));
    }

    protected async writeDeleteOriginal(): Promise<void> {
        await this.interaction.deleteReply();
    }

    protected async writeDeleteTarget(targetId: string): Promise<void> {
        await this.interaction.deleteReply(targetId);
    }

    protected async writeModal(data: APIModalInteractionResponseCallbackData): Promise<void> {
        const { interaction } = this;
        // unreachable after guardModalSource, the throw re-narrows the union for showModal
        if (interaction.isModalSubmit()) this.rejectModalSubmit();
        await interaction.showModal(data);
    }

    protected override guardModalSource(): void {
        // runtime backstop for direct sender callers, which a compile-time gate on the bases cannot cover
        if (this.interaction.isModalSubmit()) this.rejectModalSubmit();
    }

    private rejectModalSubmit(): never {
        throw new SeedcordError(SeedcordErrorCode.ReplyIllegalAckState, [
            'showModal',
            'this interaction is a modal submit',
            'A modal cannot open another modal.',
            this.routeId
        ]);
    }

    // only component and message-opened-modal kinds carry a source message
    private sourceInteraction(method: 'update' | 'deferUpdate'): SourceInteraction {
        const { interaction } = this;
        if (interaction.isMessageComponent()) return interaction;
        if (interaction.isModalSubmit() && interaction.isFromMessage()) return interaction;
        throw new SeedcordError(SeedcordErrorCode.ReplyUpdateWithoutSource, [method, this.routeId]);
    }

    private replyOptions(response: ReplyResponse | string, flags: number): InteractionReplyOptions {
        const reply = this.serialize(response);
        return {
            components: reply.components,
            flags,
            ...(reply.allowedMentions && { allowedMentions: reply.allowedMentions }),
            ...(reply.files && { files: [...reply.files] })
        };
    }

    private editOptions(response: ReplyResponse | string): WebhookMessageEditOptions {
        const reply = this.serialize(response);
        return {
            components: reply.components,
            flags: MessageFlags.IsComponentsV2,
            ...(reply.allowedMentions && { allowedMentions: reply.allowedMentions }),
            ...(reply.files && { files: [...reply.files] })
        };
    }

    private updateOptions(response: ReplyResponse | string): InteractionUpdateOptions {
        const reply = this.serialize(response);
        return {
            components: reply.components,
            flags: MessageFlags.IsComponentsV2,
            ...(reply.allowedMentions && { allowedMentions: reply.allowedMentions }),
            ...(reply.files && { files: [...reply.files] })
        };
    }

    private createdMessage(result: InteractionCallbackResponse): SentMessage | undefined {
        return result.resource?.message ?? undefined;
    }
}
