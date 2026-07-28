import { timestampFromSnowflake } from '@seedcord/utils';

import type { InteractionRoutes } from '@src/metadataKeys';
import type { DispatchOutcome, SubscriptionData } from '@subscribers/types/Subscriptions';

/** What a dispatcher knows once its handler chain settles. */
export interface DispatchReport {
    readonly routeId: string;
    readonly kind: `${InteractionRoutes}`;
    readonly outcome: DispatchOutcome;
    /** True when no route matched and the unhandled default ran. */
    readonly fallback: boolean;
    /** `performance.now()` captured as the dispatch began. */
    readonly startedAt: number;
    /** The interaction snowflake, read for the queue time. */
    readonly interactionId: string;
}

// telemetry never breaks a dispatch, and BigInt() throws on a non-digit character
function queueTime(interactionId: string): number {
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
        queuedMs: queueTime(report.interactionId)
    };
}
