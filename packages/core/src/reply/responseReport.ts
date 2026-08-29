import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';

import { asError } from '#stops/asError';
import { PublishDefault } from '#subscribers/publishDefault';

import type { Bus } from '#subscribers/Bus';
import type { ReplyMethod } from './ackLegality';

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

interface WriteStart {
    readonly routeId: string;
    readonly method: WriteMethod;
    // performance.now() captured before the write began
    readonly startedAt: number;
}

interface SentReport extends WriteStart {
    readonly outcome: 'sent';
    readonly messageId: string | null;
}

interface FailedReport extends WriteStart {
    readonly outcome: 'failed';
    readonly error: Error;
}

export type ResponseReport = SentReport | FailedReport;

/** @internal */
export function publishResponse(telemetry: ReplyTelemetry, report: ResponseReport): void {
    const durationMs = performance.now() - report.startedAt;
    const write = {
        routeId: report.routeId,
        interactionId: telemetry.interactionId,
        method: report.method,
        durationMs
    };
    telemetry.bus[PublishDefault](
        'responseAttempted',
        report.outcome === 'failed'
            ? { ...write, outcome: 'failed', messageId: null, error: report.error }
            : { ...write, outcome: 'sent', messageId: report.messageId }
    );

    // after publish so a throwing sink doesn't reach the publish above
    logger().trace(
        `${paint.sky.bold(report.routeId)} ${report.method} ${report.outcome} ${paint.mute('in')} ${Math.round(durationMs)}ms`
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
        publishResponse(telemetry, { routeId, method, startedAt, outcome: 'failed', error });
        // rethrown raw
        throw caught;
    }
}
