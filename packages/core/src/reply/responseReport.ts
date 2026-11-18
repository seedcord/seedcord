import { paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';

import { lazyLogger } from '#src/miscellaneous/lazyLogger';
import { PublishDefault } from '#subscribers/publishDefault';

import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { Bus } from '#subscribers/Bus';
import type { AttemptedWrite, ResponseAttempt } from '#subscribers/types/Subscriptions';
import type { ReplyMethod } from './ackLegality';
import type { SerializedReply } from './serializeReply';
import type { ReplyFile } from '@seedcord/types';
import type { APIModalInteractionResponseCallbackData } from 'discord-api-types/v10';
import type {
    DistributedOmit,
    DistributedPick,
    Except,
    ExcludeStrict,
    ExtractStrict,
    Promisable,
    Simplify
} from 'type-fest';

const logger = lazyLogger('Reply', { channel: 'interactions' });

export interface ReplyTelemetry {
    readonly bus: Bus;
    readonly dispatch: DispatchContext;
    readonly interactionId: string;
}

// send reports the verb it routed to. respond is the autocomplete choices callback, outside the ack state machine
export type WriteMethod = ExcludeStrict<ReplyMethod, 'send'> | 'respond';

export type MessageMethod = ExtractStrict<WriteMethod, 'reply' | 'followUp' | 'update' | 'edit'>;

// messageBody copies only the file metadata since JSON.stringify on the event would print every byte
type SentFile = Simplify<Pick<ReplyFile, 'description' | 'title'> & { readonly name: ReplyFile['name'] | null }>;

type MessageBody = Simplify<Except<SerializedReply, 'files'> & { readonly files?: SentFile[] }>;

export type WriteBody<Method extends WriteMethod> = Method extends MessageMethod
    ? MessageBody
    : Method extends 'showModal'
      ? APIModalInteractionResponseCallbackData
      : null;

type WriteOf<Outcome extends ResponseAttempt['outcome']> = DistributedPick<
    ExtractStrict<ResponseAttempt, { outcome: Outcome }>,
    'method' | 'body'
>;

// null until the body serializes
export type PendingWrite = WriteOf<'failed'>;

export type SentWrite = WriteOf<'sent'>;

type ResponseReport = DistributedOmit<ResponseAttempt, ExcludeStrict<keyof AttemptedWrite, 'method'>>;

function stringField(file: object, key: keyof SentFile): string | undefined {
    const value: unknown = Reflect.get(file, key);
    return typeof value === 'string' ? value : undefined;
}

// a discord.js file form may carry a name, alt text, and title, or be a bare Buffer, stream, or path
function sentFile(file: unknown): SentFile {
    if (typeof file !== 'object' || file === null) return { name: null };
    const description = stringField(file, 'description');
    const title = stringField(file, 'title');
    return {
        name: stringField(file, 'name') ?? null,
        ...(description !== undefined && { description }),
        ...(title !== undefined && { title })
    };
}

export function messageBody({ files, ...message }: SerializedReply<unknown>): MessageBody {
    return files ? { ...message, files: files.map(sentFile) } : message;
}

function publishResponse(telemetry: ReplyTelemetry, startedAt: number, report: ResponseReport): void {
    const durationMs = performance.now() - startedAt;
    const { routeId } = telemetry.dispatch;
    telemetry.bus[PublishDefault]('responseAttempted', {
        dispatchId: telemetry.dispatch.id,
        routeId,
        interactionId: telemetry.interactionId,
        durationMs,
        ...report
    });

    // after publish so a throwing sink doesn't reach the publish above
    logger().trace(
        `${paint.sky.bold(routeId)} ${report.method} ${report.outcome} ${paint.mute('in')} ${Math.round(durationMs)}ms`
    );
}

export function publishSent(
    telemetry: ReplyTelemetry,
    startedAt: number,
    sent: SentWrite,
    messageId: string | null
): void {
    publishResponse(telemetry, startedAt, { ...sent, outcome: 'sent', messageId });
}

export async function reportedRespond<Result>(
    telemetry: ReplyTelemetry,
    write: () => Promise<Result>
): Promise<Result> {
    const startedAt = performance.now();
    const respond = { method: 'respond', body: null } as const;
    const result = await attemptWrite(telemetry, startedAt, respond, write);
    publishSent(telemetry, startedAt, respond, null);
    return result;
}

// publishes the failed outcome when write() throws since the caller's success report sits after the write and a throw skips it
export async function attemptWrite<Result>(
    telemetry: ReplyTelemetry,
    startedAt: number,
    pending: PendingWrite,
    write: () => Promisable<Result>
): Promise<Result> {
    try {
        return await write();
    } catch (caught) {
        publishResponse(telemetry, startedAt, {
            ...pending,
            outcome: 'failed',
            messageId: null,
            error: asError(caught)
        });
        // rethrown raw
        throw caught;
    }
}
