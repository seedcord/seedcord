import { Logger, paint } from '@seedcord/logger';
import { timestampFromSnowflake } from '@seedcord/utils';

import { Notice } from '@stops/Notice';
import { Silence } from '@stops/Silence';
import { PublishDefault } from '@subscribers/publishDefault';

import type { InteractionRoutes } from '@src/metadataKeys';
import type { Bus } from '@subscribers/Bus';
import type { DispatchOutcome } from '@subscribers/types/Subscriptions';

let dispatchLogger: Logger | undefined;
function logger(): Logger {
    dispatchLogger ??= new Logger('Dispatch', { channel: 'interactions' });
    return dispatchLogger;
}

/**
 * Classifies a caught stop for `interactionDispatched` so a gate and a
 * handler label the same stop identically.
 *
 * @internal
 */
export function outcomeFor(caught: unknown): DispatchOutcome {
    if (caught instanceof Silence) return 'refused';
    if (caught instanceof Notice) return caught.report ? 'failed' : 'refused';
    return 'failed';
}

/** The values a dispatcher has once its handler chain settles. */
interface DispatchReport {
    readonly routeId: string;
    readonly interactionId: string;
    readonly kind: `${InteractionRoutes}`;
    readonly outcome: DispatchOutcome;
    /** True when no route matched and the unhandled default ran. */
    readonly fallback: boolean;
    /** `performance.now()` captured as the dispatch began. */
    readonly startedAt: number;
    /** {@link queuedMsFor} read at the same moment as `startedAt`. */
    readonly queuedMs: number;
}

/**
 * Discord's interaction creation to now, read from the snowflake. Called at dispatch entry, since
 * a later read would count the handler run into the queue time as well.
 *
 * @internal
 */
export function queuedMsFor(interactionId: string): number {
    // telemetry never breaks a dispatch, and BigInt() throws on a malformed id
    try {
        return Date.now() - timestampFromSnowflake(interactionId);
    } catch {
        return 0;
    }
}

/**
 * Traces the settled dispatch and publishes `interactionDispatched`, so both transports report it the
 * same way.
 *
 * @internal
 */
export function reportDispatch(bus: Bus, report: DispatchReport): void {
    const durationMs = performance.now() - report.startedAt;
    logger().trace(
        `${paint.mint.bold(report.routeId)} ${report.outcome} ${paint.mute('in')} ${Math.round(durationMs)}ms`
    );
    bus[PublishDefault]('interactionDispatched', {
        routeId: report.routeId,
        interactionId: report.interactionId,
        kind: report.kind,
        outcome: report.outcome,
        fallback: report.fallback,
        durationMs,
        queuedMs: report.queuedMs
    });
}
