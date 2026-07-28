import { PublishDefault } from '@subscribers/publishDefault';

import type { ReplyMethod } from './ackLegality';
import type { Bus } from '@subscribers/Bus';
import type { ResponseOutcome } from '@subscribers/types/Subscriptions';

/** What a write needs to publish `responseAttempted`. A caller without it stays silent. */
export interface ReplyTelemetry {
    readonly bus: Bus;
    readonly interactionId: string;
}

/** The reply verbs plus the autocomplete choices callback, which runs outside the ack state machine. */
export type WriteMethod = ReplyMethod | 'respond';

/** What one write reports once it settles. */
export interface ResponseReport {
    readonly routeId: string;
    readonly method: WriteMethod;
    /** `performance.now()` captured before the write began. */
    readonly startedAt: number;
    readonly outcome: ResponseOutcome;
    readonly messageId: string | null;
    readonly error?: Error;
}

/** @internal */
export function publishResponse(telemetry: ReplyTelemetry | undefined, report: ResponseReport): void {
    telemetry?.bus[PublishDefault]('responseAttempted', {
        routeId: report.routeId,
        interactionId: telemetry.interactionId,
        method: report.method,
        outcome: report.outcome,
        durationMs: performance.now() - report.startedAt,
        messageId: report.messageId,
        ...(report.error && { error: report.error })
    });
}

/**
 * Runs a wire write and publishes the `failed` arm when it throws, since the caller's success report
 * sits after the write and a throw skips it.
 *
 * @internal
 */
export async function attemptWrite<Result>(
    telemetry: ReplyTelemetry | undefined,
    routeId: string,
    method: WriteMethod,
    startedAt: number,
    write: () => Promise<Result>
): Promise<Result> {
    try {
        return await write();
    } catch (caught) {
        const error = Error.isError(caught) ? caught : new Error(String(caught));
        publishResponse(telemetry, { routeId, method, startedAt, outcome: 'failed', messageId: null, error });
        throw caught;
    }
}
