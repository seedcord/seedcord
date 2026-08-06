import { BaseReplySender, deferFlags, sendFlags } from '@seedcord/core/internal';
import { InteractionResponseType, MessageFlags, Routes } from 'discord-api-types/v10';

import type { REST, RawFile } from '@discordjs/rest';
import type { Bus } from '@seedcord/core';
import type { SerializedReply } from '@seedcord/core/internal';
import type { DeferOpts, ReplyResponse, SendOpts, TypedOmit } from '@seedcord/types';
import type { APIMessage, APIModalInteractionResponseCallbackData } from 'discord-api-types/v10';

/** The interaction payload fields the sender writes its wire from. */
export interface InteractionRef {
    readonly application_id: string;
    readonly id: string;
    readonly token: string;
}

/** The created message an http reply resolves to (the http `SentMessage` lens). */
export type SentMessage = APIMessage;

// the framework's allowedMentions keys are camelCase, and the wire reads replied_user
type WireAllowedMentions = TypedOmit<NonNullable<ReplyResponse['allowedMentions']>, 'repliedUser'> & {
    replied_user?: boolean;
};

interface WireAttachment {
    id: number;
    filename: string;
    description?: string;
    title?: string;
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
    if (!files?.some((file) => file.description ?? file.title)) return null;
    return files.map((file, index) => ({
        id: index,
        filename: file.name,
        ...(file.description && { description: file.description }),
        ...(file.title && { title: file.title })
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
 * Writes interaction responses over the Discord REST callback and webhook endpoints. Construction is
 * internal to the repliable handler bases and the dispatcher.
 */
export class ReplySender extends BaseReplySender<SentMessage> {
    public constructor(
        private readonly ref: InteractionRef,
        private readonly rest: REST,
        routeId: string,
        bus: Bus
    ) {
        super(routeId, { bus, interactionId: ref.id });
    }

    protected async writeReply(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage | undefined> {
        const reply = this.serialize(response);
        const result = await this.callback(
            InteractionResponseType.ChannelMessageWithSource,
            callbackData(reply, sendFlags(opts)),
            reply.files
        );
        return this.createdMessage(result);
    }

    protected async writeDefer(opts?: DeferOpts): Promise<void> {
        await this.callback(InteractionResponseType.DeferredChannelMessageWithSource, { flags: deferFlags(opts) });
    }

    protected async writeDeferUpdate(): Promise<void> {
        await this.callback(InteractionResponseType.DeferredMessageUpdate);
    }

    protected async writeUpdate(response: ReplyResponse | string): Promise<SentMessage | undefined> {
        const reply = this.serialize(response);
        const result = await this.callback(
            InteractionResponseType.UpdateMessage,
            callbackData(reply, MessageFlags.IsComponentsV2),
            reply.files
        );
        return this.createdMessage(result);
    }

    protected async writeFollowUp(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        const reply = this.serialize(response);
        // discord returns the created message for interaction-token followups either way. wait=true pins
        // that contract and matches the djs webhook client
        const result = await this.rest.post(Routes.webhook(this.ref.application_id, this.ref.token), {
            body: callbackData(reply, sendFlags(opts)),
            query: new URLSearchParams({ wait: 'true' }),
            ...(reply.files && { files: this.rawFiles(reply.files) })
        });
        // justified: a webhook POST returns the created message
        return result as SentMessage;
    }

    protected writeEditOriginal(response: ReplyResponse | string): Promise<SentMessage> {
        return this.editMessage(
            Routes.webhookMessage(this.ref.application_id, this.ref.token),
            this.serialize(response)
        );
    }

    protected writeEditTarget(targetId: string, response: ReplyResponse | string): Promise<SentMessage> {
        const route = Routes.webhookMessage(this.ref.application_id, this.ref.token, targetId);
        return this.editMessage(route, this.serialize(response));
    }

    protected async writeDeleteOriginal(): Promise<void> {
        await this.rest.delete(Routes.webhookMessage(this.ref.application_id, this.ref.token));
    }

    protected async writeDeleteTarget(targetId: string): Promise<void> {
        await this.rest.delete(Routes.webhookMessage(this.ref.application_id, this.ref.token, targetId));
    }

    protected async writeModal(data: APIModalInteractionResponseCallbackData): Promise<void> {
        await this.callback(InteractionResponseType.Modal, data);
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

    private async editMessage(route: `/${string}`, reply: SerializedReply): Promise<SentMessage> {
        const result = await this.rest.patch(route, {
            body: callbackData(reply, MessageFlags.IsComponentsV2),
            ...(reply.files && { files: this.rawFiles(reply.files) })
        });
        // justified: a webhook message PATCH returns the edited message
        return result as SentMessage;
    }

    private rawFiles(files: NonNullable<SerializedReply['files']>): RawFile[] {
        return files.map((file) => ({ name: file.name, data: file.data }));
    }

    private createdMessage(result: unknown): SentMessage | undefined {
        // justified: the with_response callback wire shape
        return (result as { resource?: { message?: SentMessage } }).resource?.message;
    }
}
