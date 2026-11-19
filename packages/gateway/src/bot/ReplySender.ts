import { basename } from 'node:path';

import { BaseReplySender } from '@seedcord/core';
import { replyFileInfo } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { MessageFlags } from 'discord.js';

import type { GatewayFile } from '#interfaces/ReplyResponse';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { Bus, DispatchContext } from '@seedcord/core';
import type { AckState, SentFile, SerializedReply } from '@seedcord/core/internal';
import type { ReplyFile } from '@seedcord/types';
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

// djs kinds that carry a source message
type SourceInteraction = MessageComponentInteraction | ModalMessageModalSubmitInteraction;

export type SentMessage = Message;

type GatewayReply = SerializedReply<GatewayFile>;

function isReplyFile(file: ReplyFile | GatewayFile): file is ReplyFile {
    return typeof file === 'object' && 'data' in file && ArrayBuffer.isView(file.data);
}

// discord.js rejects a plain Uint8Array
function toDjsFile(file: ReplyFile | GatewayFile): GatewayFile {
    if (!isReplyFile(file)) return file;
    return {
        attachment: Buffer.from(file.data),
        name: file.name,
        ...(file.description !== undefined && { description: file.description }),
        ...(file.title !== undefined && { title: file.title })
    };
}

function stringField(file: object, key: string): string | undefined {
    const value: unknown = Reflect.get(file, key);
    return typeof value === 'string' ? value : undefined;
}

// discord.js's naming rule for an upload without a name, from MessagePayload.resolveFile
function djsFileName(attachment: unknown): string {
    if (typeof attachment === 'string') return basename(attachment);
    const streamPath =
        typeof attachment === 'object' && attachment !== null ? stringField(attachment, 'path') : undefined;
    return streamPath === undefined ? 'file.jpg' : basename(streamPath);
}

function gatewayFileInfo(file: GatewayFile): SentFile {
    // the same check discord.js runs: a path, a Buffer, or a stream is its own attachment
    if (typeof file === 'string' || Buffer.isBuffer(file) || typeof Reflect.get(file, 'pipe') === 'function') {
        return { name: djsFileName(file) };
    }
    const description = stringField(file, 'description');
    const title = stringField(file, 'title');
    return {
        name: stringField(file, 'name') ?? djsFileName(Reflect.get(file, 'attachment')),
        ...(description !== undefined && { description }),
        ...(title !== undefined && { title })
    };
}

// seed the state once because djs flips `replied` on editReply, and deriving it per call would break repeated update()
function seedState({ deferred, replied, ephemeral }: Repliables): AckState {
    // djs leaves ephemeral null after a deferUpdate
    if (deferred && ephemeral === null) return 'deferred-update';
    if (replied) return 'replied';
    if (deferred) return 'deferred-reply';
    return 'unacked';
}

// an earlier deferReply sets the default the same way BaseReplySender.defer() does
function seedEphemeral({ deferred, ephemeral }: Repliables, configured: boolean): boolean {
    return deferred && ephemeral !== null ? ephemeral : configured;
}

/** Writes interaction responses through discord.js. The repliable handler bases and the dispatcher construct it. */
export class ReplySender extends BaseReplySender<SentMessage, GatewayFile> {
    public constructor(
        private readonly interaction: Repliables,
        dispatch: DispatchContext,
        bus: Bus,
        isEphemeralByDefault: boolean
    ) {
        super(
            { bus, dispatch, interactionId: interaction.id },
            seedEphemeral(interaction, isEphemeralByDefault),
            seedState(interaction)
        );
    }

    protected async writeReply(reply: GatewayReply, flags: number): Promise<SentMessage | undefined> {
        const result = await this.interaction.reply({ ...this.replyOptions(reply, flags), withResponse: true });
        return this.createdMessage(result);
    }

    protected async writeDefer(flags: number): Promise<void> {
        await this.interaction.deferReply({ flags });
    }

    protected async writeDeferUpdate(): Promise<void> {
        await this.sourceInteraction('deferUpdate').deferUpdate();
    }

    protected async writeUpdate(reply: GatewayReply): Promise<SentMessage | undefined> {
        const source = this.sourceInteraction('update');
        const result = await source.update({ ...this.updateOptions(reply), withResponse: true });
        return this.createdMessage(result);
    }

    protected async writeFollowUp(reply: GatewayReply, flags: number): Promise<SentMessage> {
        return await this.interaction.followUp(this.replyOptions(reply, flags));
    }

    protected async writeEditOriginal(reply: GatewayReply): Promise<SentMessage> {
        return await this.interaction.editReply(this.editOptions(reply));
    }

    protected async writeEditTarget(targetId: string, reply: GatewayReply): Promise<SentMessage> {
        return await this.interaction.webhook.editMessage(targetId, this.editOptions(reply));
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

    protected describeFile(file: ReplyFile | GatewayFile): SentFile {
        return isReplyFile(file) ? replyFileInfo(file) : gatewayFileInfo(file);
    }

    protected override guardModalSource(): void {
        // the bases gate this at compile time. a direct sender caller skips that
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

    private sourceInteraction(method: 'update' | 'deferUpdate'): SourceInteraction {
        const { interaction } = this;
        if (interaction.isMessageComponent()) return interaction;
        if (interaction.isModalSubmit() && interaction.isFromMessage()) return interaction;
        throw new SeedcordError(SeedcordErrorCode.ReplyUpdateWithoutSource, [method, this.routeId]);
    }

    private replyOptions(reply: GatewayReply, flags: number): InteractionReplyOptions {
        return {
            components: reply.components,
            flags,
            ...(reply.allowedMentions && { allowedMentions: reply.allowedMentions }),
            ...(reply.files && { files: reply.files.map(toDjsFile) })
        };
    }

    private editOptions(reply: GatewayReply): WebhookMessageEditOptions {
        return {
            components: reply.components,
            flags: MessageFlags.IsComponentsV2,
            ...(reply.allowedMentions && { allowedMentions: reply.allowedMentions }),
            ...(reply.files && { files: reply.files.map(toDjsFile) })
        };
    }

    private updateOptions(reply: GatewayReply): InteractionUpdateOptions {
        return {
            components: reply.components,
            flags: MessageFlags.IsComponentsV2,
            ...(reply.allowedMentions && { allowedMentions: reply.allowedMentions }),
            ...(reply.files && { files: reply.files.map(toDjsFile) })
        };
    }

    private createdMessage(result: InteractionCallbackResponse): SentMessage | undefined {
        return result.resource?.message ?? undefined;
    }
}
