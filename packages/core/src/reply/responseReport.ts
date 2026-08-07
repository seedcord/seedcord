import { Logger, paint } from '@seedcord/logger';

import { asError } from '@stops/asError';
import { PublishDefault } from '@subscribers/publishDefault';

import type { ReplyMethod } from './ackLegality';
import type { Bus } from '@subscribers/Bus';
import type { ResponseOutcome } from '@subscribers/types/Subscriptions';

let replyLogger: Logger | undefined;
function logger(): Logger {
    replyLogger ??= new Logger('Reply', { channel: 'interactions' });
    return replyLogger;
}

export interface ReplyTelemetry {
    readonly bus: Bus;
    readonly interactionId: string;
}

// the reply verbs plus the autocomplete choices callback, which runs outside the ack state machine
export type WriteMethod = ReplyMethod | 'respond';

export interface ResponseReport {
    readonly routeId: string;
    readonly method: WriteMethod;
    // performance.now() captured before the write began
    readonly startedAt: number;
    readonly outcome: ResponseOutcome;
    readonly messageId: string | null;
    readonly error?: Error;
}

/** @internal */
export function publishResponse(telemetry: ReplyTelemetry, report: ResponseReport): void {
    const durationMs = performance.now() - report.startedAt;
    telemetry.bus[PublishDefault]('responseAttempted', {
        routeId: report.routeId,
        interactionId: telemetry.interactionId,
        method: report.method,
        outcome: report.outcome,
        durationMs,
        messageId: report.messageId,
        ...(report.error && { error: report.error })
    });

    // after publish so a throwing sink doesn't reach the publish above
    logger().trace(
        `${paint.mint.bold(report.routeId)} ${report.method} ${report.outcome} ${paint.mute('in')} ${Math.round(durationMs)}ms`
    );
}

export async function reportedWrite<Result>(
    telemetry: ReplyTelemetry,
    routeId: string,
    method: WriteMethod,
    write: () => Promise<Result>
): Promise<Result> {
    const startedAt = performance.now();
    const result = await attemptWrite(telemetry, routeId, method, startedAt, write);
    publishResponse(telemetry, { routeId, method, startedAt, outcome: 'sent', messageId: null });
    return result;
}

// publishes the failed arm when write() throws, since the caller's success report sits after the write and a throw skips it
export async function attemptWrite<Result>(
    telemetry: ReplyTelemetry,
    routeId: string,
    method: WriteMethod,
    startedAt: number,
    write: () => Promise<Result>
): Promise<Result> {
    try {
        return await write();
    } catch (caught) {
        const error = asError(caught);
        publishResponse(telemetry, { routeId, method, startedAt, outcome: 'failed', messageId: null, error });
        // rethrown raw
        throw caught;
    }
}
