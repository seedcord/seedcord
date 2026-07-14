import {
    checkAckLegality,
    deferFlags,
    sendFlags,
    sendTarget,
    serializeReply,
    translateSerializationError
} from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { MessageFlags } from 'discord.js';

import type { Repliables } from '@handlers/BaseHandler';
import type { AckState, SerializedReply } from '@seedcord/core/internal';
import type { DeferOpts, ReplyResponse, SendOpts } from '@seedcord/types';
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

/** The shape djs modal builders emit from `toJSON()`. */
export interface ModalLike {
    toJSON(): APIModalInteractionResponseCallbackData;
}

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
 * Writes interaction responses through the discord.js interaction, tracking its own acknowledgement state
 * so an illegal verb throws a translated {@link SeedcordError} before any djs call. Construction is internal
 * to the repliable handler bases and the dispatcher.
 */
export class ReplySender {
    private state: AckState;
    // the only ids a targeted edit accepts
    private readonly sent = new Set<string>();

    public constructor(
        private readonly interaction: Repliables,
        private readonly routeId: string
    ) {
        this.state = seedState(interaction);
    }

    public async reply(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        checkAckLegality('reply', this.state, this.routeId);
        const result = await this.interaction.reply({
            ...this.replyOptions(response, sendFlags(opts)),
            withResponse: true
        });
        this.state = 'replied';
        return this.createdMessage(result, 'reply');
    }

    public async defer(opts?: DeferOpts): Promise<void> {
        checkAckLegality('defer', this.state, this.routeId);
        await this.interaction.deferReply({ flags: deferFlags(opts) });
        this.state = 'deferred-reply';
    }

    public async deferUpdate(): Promise<void> {
        checkAckLegality('deferUpdate', this.state, this.routeId);
        const source = this.sourceInteraction('deferUpdate');
        await source.deferUpdate();
        this.state = 'deferred-update';
    }

    /** After a deferUpdate the state stays deferred-update, so the rewrite repeats. */
    public async update(response: ReplyResponse | string): Promise<SentMessage> {
        checkAckLegality('update', this.state, this.routeId);
        // in deferred-update, @original is the source message and the ack-legality check above already passed
        if (this.state === 'deferred-update') return await this.editOriginal(response);
        const source = this.sourceInteraction('update');
        const result = await source.update({ ...this.updateOptions(response), withResponse: true });
        this.state = 'replied';
        return this.createdMessage(result, 'update');
    }

    public async followUp(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        checkAckLegality('followUp', this.state, this.routeId);
        const created = await this.interaction.followUp(this.replyOptions(response, sendFlags(opts)));
        return this.remember(created);
    }

    public edit(response: ReplyResponse | string): Promise<SentMessage>;
    public edit(target: SentMessage, response: ReplyResponse | string): Promise<SentMessage>;
    public async edit(
        targetOrResponse: SentMessage | ReplyResponse | string,
        maybeResponse?: ReplyResponse | string
    ): Promise<SentMessage> {
        checkAckLegality('edit', this.state, this.routeId);
        if (maybeResponse === undefined) {
            return await this.editOriginal(targetOrResponse);
        }
        // justified: the overloads narrow targetOrResponse once maybeResponse is defined
        const target = targetOrResponse as SentMessage;
        if (!this.sent.has(target.id)) {
            throw new SeedcordError(SeedcordErrorCode.ReplyForeignEditTarget, [target.id, this.routeId]);
        }
        const edited = await this.interaction.webhook.editMessage(target.id, this.editOptions(maybeResponse));
        return this.remember(edited);
    }

    /** Routes to the verb the current ack state permits. Every state has a route, so the illegal-ack throw is unreachable. */
    public async send(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        const target = sendTarget(this.state);
        if (target === 'reply') return await this.reply(response, opts);
        if (target === 'edit') return await this.edit(response);
        return await this.followUp(response, opts);
    }

    /** Must be the initial response. */
    public async showModal(modal: ModalLike): Promise<void> {
        checkAckLegality('showModal', this.state, this.routeId);
        // runtime backstop for direct sender callers, which a compile-time gate on the bases cannot cover
        const { interaction } = this;
        if (interaction.isModalSubmit()) {
            throw new SeedcordError(SeedcordErrorCode.ReplyIllegalAckState, [
                'showModal',
                'this interaction is a modal submit',
                'A modal cannot open another modal.',
                this.routeId
            ]);
        }
        let data: APIModalInteractionResponseCallbackData;
        try {
            data = modal.toJSON();
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- a null-prototype modal has no constructor at runtime
            const name = modal.constructor?.name;
            throw translateSerializationError(error, !name || name === 'Object' ? 'modal' : name, 0, this.routeId);
        }
        await interaction.showModal(data);
        this.state = 'replied';
    }

    // only component and message-opened-modal kinds carry a source message
    private sourceInteraction(method: 'update' | 'deferUpdate'): SourceInteraction {
        const { interaction } = this;
        if (interaction.isMessageComponent()) return interaction;
        if (interaction.isModalSubmit() && interaction.isFromMessage()) return interaction;
        throw new SeedcordError(SeedcordErrorCode.ReplyUpdateWithoutSource, [method, this.routeId]);
    }

    private async editOriginal(response: ReplyResponse | string): Promise<SentMessage> {
        const edited = await this.interaction.editReply(this.editOptions(response));
        // after a deferUpdate, @original is the source message, which this interaction did not send
        if (this.state !== 'deferred-update') this.remember(edited);
        return edited;
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

    private serialize(response: ReplyResponse | string): SerializedReply {
        return serializeReply(response, this.routeId);
    }

    private createdMessage(result: InteractionCallbackResponse, method: 'reply' | 'update'): SentMessage {
        // djs types resource.message nullable, a type 4/7 callback with withResponse should always carry it
        const message = result.resource?.message;
        if (!message) {
            throw new SeedcordError(SeedcordErrorCode.ReplyCallbackMissingMessage, [method, this.routeId]);
        }
        return this.remember(message);
    }

    private remember(created: SentMessage): SentMessage {
        this.sent.add(created.id);
        return created;
    }
}
