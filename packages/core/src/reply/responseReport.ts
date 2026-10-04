import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';

import { asError } from '#stops/asError';
import { PublishDefault } from '#subscribers/publishDefault';

import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { Bus } from '#subscribers/Bus';
import type { ReplyMethod } from './ackLegality';

let replyLogger: Logger | undefined;
function logger(): Logger {
    replyLogger ??= new Logger('Reply', { channel: 'interactions' });
    return replyLogger;
}

export interface ReplyTelemetry {
    readonly bus: Bus;
    readonly dispatch: DispatchContext;
    readonly interactionId: string;
}

// the reply verbs plus the autocomplete choices callback, which runs outside the ack state machine
export type WriteMethod = ReplyMethod | 'respond';

interface WriteStart {
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
    const { routeId } = telemetry.dispatch;
    const write = {
        dispatchId: telemetry.dispatch.id,
        routeId,
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
        `${paint.sky.bold(routeId)} ${report.method} ${report.outcome} ${paint.mute('in')} ${Math.round(durationMs)}ms`
    );
}

export async function reportedWrite<Result>(
    telemetry: ReplyTelemetry,
    method: WriteMethod,
    write: () => Promise<Result>
): Promise<Result> {
    const startedAt = performance.now();
    const result = await attemptWrite(telemetry, method, startedAt, write);
    publishResponse(telemetry, { method, startedAt, outcome: 'sent', messageId: null });
    return result;
}

// publishes the failed arm when write() throws, since the caller's success report sits after the write and a throw skips it
export async function attemptWrite<Result>(
    telemetry: ReplyTelemetry,
    method: WriteMethod,
    startedAt: number,
    write: () => Promise<Result>
): Promise<Result> {
    try {
        return await write();
    } catch (caught) {
        const error = asError(caught);
        publishResponse(telemetry, { method, startedAt, outcome: 'failed', error });
        // rethrown raw
        throw caught;
    }
}
