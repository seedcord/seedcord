import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { Bus } from '#subscribers/Bus';
import type { ResponseAttempt } from '#subscribers/types/Subscriptions';
import type { ReplyMethod } from './ackLegality';
import type { SerializedReply } from './serializeReply';
import type { ReplyFile } from '@seedcord/types';
import type { APIModalInteractionResponseCallbackData } from 'discord-api-types/v10';
import type { DistributedPick, Except, ExcludeStrict, ExtractStrict, Simplify } from 'type-fest';

export interface ReplyTelemetry {
    readonly bus: Bus;
    readonly dispatch: DispatchContext;
    readonly interactionId: string;
}

// send reports the verb it routed to. respond is the autocomplete choices callback, outside the ack state machine
export type WriteMethod = ExcludeStrict<ReplyMethod, 'send'> | 'respond';

export type MessageMethod = ExtractStrict<WriteMethod, 'reply' | 'followUp' | 'update' | 'edit'>;

// messageBody copies only the file metadata since JSON.stringify on the event would print every byte
export type SentFile = Simplify<Pick<ReplyFile, 'name' | 'description' | 'title'>>;

type MessageBody = Simplify<Except<SerializedReply, 'files'> & { readonly files?: SentFile[] }>;

// a verb missing from here fails to compile at WriteBody
interface WriteBodies {
    reply: MessageBody;
    followUp: MessageBody;
    update: MessageBody;
    edit: MessageBody;
    showModal: APIModalInteractionResponseCallbackData;
    defer: null;
    deferUpdate: null;
    delete: null;
    respond: null;
}

export type WriteBody<Method extends WriteMethod> = WriteBodies[Method];

type WriteOf<Outcome extends ResponseAttempt['outcome']> = DistributedPick<
    ExtractStrict<ResponseAttempt, { outcome: Outcome }>,
    'method' | 'body'
>;

// body is null if serializing throws
export type PendingWrite = WriteOf<'failed'>;

export type SentWrite = WriteOf<'sent'>;

export function replyFileInfo({ name, description, title }: ReplyFile): SentFile {
    return { name, ...(description !== undefined && { description }), ...(title !== undefined && { title }) };
}

export function messageBody<TNative>(
    { files, ...message }: SerializedReply<TNative>,
    describe: (file: ReplyFile | TNative) => SentFile
): MessageBody {
    return files ? { ...message, files: files.map(describe) } : message;
}
