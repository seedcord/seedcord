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
import { InteractionResponseType, MessageFlags, Routes } from 'discord-api-types/v10';

import type { REST, RawFile } from '@discordjs/rest';
import type { AckState, SerializedReply } from '@seedcord/core/internal';
import type { DeferOpts, ReplyResponse, SendOpts, TypedOmit } from '@seedcord/types';
import type { APIMessage, APIModalInteractionResponseCallbackData } from 'discord-api-types/v10';

/** The interaction payload fields the sender writes its wire from. */
export interface InteractionRef {
    readonly application_id: string;
    readonly id: string;
    readonly token: string;
}

/** The shape djs modal builders emit from `toJSON()`. */
export interface ModalLike {
    toJSON(): APIModalInteractionResponseCallbackData;
}

/** The created message an http reply resolves to (the http `SentMessage` lens). */
export type SentMessage = APIMessage;

// the framework's allowedMentions keys are camelCase, the wire reads replied_user
type WireAllowedMentions = TypedOmit<NonNullable<ReplyResponse['allowedMentions']>, 'repliedUser'> & {
    replied_user?: boolean;
};

interface WireAttachment {
    id: number;
    filename?: string;
    description?: string;
}

interface MessageBody {
    flags: number;
    components: SerializedReply['components'];
    allowed_mentions?: WireAllowedMentions;
    attachments?: WireAttachment[];
}

function wireAllowedMentions(mentions: NonNullable<ReplyResponse['allowedMentions']>): WireAllowedMentions {
    const { repliedUser, ...wire } = mentions;
    return { ...wire, ...(repliedUser !== undefined && { replied_user: repliedUser }) };
}

// RawFile has no description field, so alt text goes on the wire attachments entries
function wireAttachments(files: SerializedReply['files']): WireAttachment[] | null {
    if (!files?.some((file) => file.description)) return null;
    return files.map((file, index) => ({
        id: index,
        ...(file.name && { filename: file.name }),
        ...(file.description && { description: file.description })
    }));
}

function callbackData(reply: SerializedReply, flags: number): MessageBody {
    const attachments = wireAttachments(reply.files);
    return {
        flags,
        components: reply.components,
        ...(reply.allowedMentions && { allowed_mentions: wireAllowedMentions(reply.allowedMentions) }),
        ...(attachments && { attachments })
    };
}

/**
 * Writes interaction responses over the Discord REST callback and webhook endpoints, tracking its own
 * acknowledgement state so an illegal verb throws a translated {@link SeedcordError} before any API call.
 * Construction is internal to the repliable handler bases and the dispatcher.
 */
export class ReplySender {
    private state: AckState = 'unacked';
    // the only ids a targeted edit accepts
    private readonly sent = new Set<string>();

    public constructor(
        private readonly ref: InteractionRef,
        private readonly rest: REST,
        private readonly routeId: string
    ) {}

    public async reply(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        checkAckLegality('reply', this.state, this.routeId);
        const reply = this.serialize(response);
        const result = await this.callback(
            InteractionResponseType.ChannelMessageWithSource,
            callbackData(reply, sendFlags(opts)),
            reply.files
        );
        this.state = 'replied';
        return this.remember(this.createdMessage(result, 'reply'));
    }

    public async defer(opts?: DeferOpts): Promise<void> {
        checkAckLegality('defer', this.state, this.routeId);
        await this.callback(InteractionResponseType.DeferredChannelMessageWithSource, { flags: deferFlags(opts) });
        this.state = 'deferred-reply';
    }

    public async deferUpdate(): Promise<void> {
        checkAckLegality('deferUpdate', this.state, this.routeId);
        await this.callback(InteractionResponseType.DeferredMessageUpdate);
        this.state = 'deferred-update';
    }

    /** Rewrites the source message. After a deferUpdate the state stays deferred-update, so the rewrite repeats. */
    public async update(response: ReplyResponse | string): Promise<SentMessage> {
        checkAckLegality('update', this.state, this.routeId);
        const reply = this.serialize(response);
        if (this.state === 'deferred-update') return await this.editOriginal(reply);
        const result = await this.callback(
            InteractionResponseType.UpdateMessage,
            callbackData(reply, MessageFlags.IsComponentsV2),
            reply.files
        );
        this.state = 'replied';
        return this.remember(this.createdMessage(result, 'update'));
    }

    public async followUp(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        checkAckLegality('followUp', this.state, this.routeId);
        const reply = this.serialize(response);
        // discord returns the created message for interaction-token followups either way, wait=true
        // pins that contract explicitly and matches the djs webhook client
        const result = await this.rest.post(Routes.webhook(this.ref.application_id, this.ref.token), {
            body: callbackData(reply, sendFlags(opts)),
            query: new URLSearchParams({ wait: 'true' }),
            ...(reply.files && { files: this.rawFiles(reply.files) })
        });
        // justified: a webhook POST returns the created message
        return this.remember(result as SentMessage);
    }

    public edit(response: ReplyResponse | string): Promise<SentMessage>;
    public edit(target: SentMessage, response: ReplyResponse | string): Promise<SentMessage>;
    public async edit(
        targetOrResponse: SentMessage | ReplyResponse | string,
        maybeResponse?: ReplyResponse | string
    ): Promise<SentMessage> {
        checkAckLegality('edit', this.state, this.routeId);
        // justified: the overloads narrow targetOrResponse by whether maybeResponse is defined
        if (maybeResponse === undefined) {
            return await this.editOriginal(this.serialize(targetOrResponse as ReplyResponse | string));
        }
        const target = targetOrResponse as SentMessage;
        if (!this.sent.has(target.id)) {
            throw new SeedcordError(SeedcordErrorCode.ReplyForeignEditTarget, [target.id, this.routeId]);
        }
        const route = Routes.webhookMessage(this.ref.application_id, this.ref.token, target.id);
        return await this.editMessage(route, this.serialize(maybeResponse));
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
        let data: unknown;
        try {
            data = modal.toJSON();
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- a null-prototype modal has no constructor at runtime
            const name = modal.constructor?.name;
            throw translateSerializationError(error, !name || name === 'Object' ? 'modal' : name, 0, this.routeId);
        }
        await this.callback(InteractionResponseType.Modal, data);
        this.state = 'replied';
    }

    private serialize(response: ReplyResponse | string): SerializedReply {
        return serializeReply(response, this.routeId);
    }

    private async callback(
        type: InteractionResponseType,
        data?: unknown,
        files?: SerializedReply['files']
    ): Promise<unknown> {
        const withResponse =
            type === InteractionResponseType.ChannelMessageWithSource || type === InteractionResponseType.UpdateMessage;
        return await this.rest.post(Routes.interactionCallback(this.ref.id, this.ref.token), {
            body: { type, ...(data !== undefined && { data }) },
            ...(withResponse && { query: new URLSearchParams({ with_response: 'true' }) }),
            ...(files && { files: this.rawFiles(files) })
        });
    }

    private editOriginal(reply: SerializedReply): Promise<SentMessage> {
        return this.editMessage(Routes.webhookMessage(this.ref.application_id, this.ref.token), reply);
    }

    private async editMessage(route: `/${string}`, reply: SerializedReply): Promise<SentMessage> {
        const result = await this.rest.patch(route, {
            body: callbackData(reply, MessageFlags.IsComponentsV2),
            ...(reply.files && { files: this.rawFiles(reply.files) })
        });
        // justified: a webhook message PATCH returns the edited message
        const message = result as SentMessage;
        // after a deferUpdate, @original is the source message, which this interaction did not send
        if (this.state !== 'deferred-update') this.remember(message);
        return message;
    }

    private rawFiles(files: NonNullable<SerializedReply['files']>): RawFile[] {
        return files.map((file, index) => ({ name: file.name ?? `file-${index}`, data: file.attachment }));
    }

    private createdMessage(result: unknown, method: 'reply' | 'update'): SentMessage {
        // justified: the with_response callback wire shape, the guard covers an absent message
        const message = (result as { resource?: { message?: SentMessage } }).resource?.message;
        if (!message) {
            throw new SeedcordError(SeedcordErrorCode.ReplyCallbackMissingMessage, [method, this.routeId]);
        }
        return message;
    }

    private remember(created: SentMessage): SentMessage {
        this.sent.add(created.id);
        return created;
    }
}
