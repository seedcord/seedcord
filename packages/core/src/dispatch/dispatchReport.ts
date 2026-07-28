import { timestampFromSnowflake } from '@seedcord/utils';

import { Notice } from '@stops/Notice';
import { Silence } from '@stops/Silence';

import type { InteractionRoutes } from '@src/metadataKeys';
import type { DispatchOutcome, SubscriptionData } from '@subscribers/types/Subscriptions';

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
 * Builds the `interactionDispatched` payload both transports publish, so the two clocks are read the
 * same way on each.
 *
 * @internal
 */
export function dispatchedPayload(report: DispatchReport): SubscriptionData<'interactionDispatched'> {
    return {
        routeId: report.routeId,
        kind: report.kind,
        outcome: report.outcome,
        fallback: report.fallback,
        durationMs: performance.now() - report.startedAt,
        queuedMs: report.queuedMs
    };
}
