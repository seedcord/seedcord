import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { timestampFromSnowflake } from '@seedcord/utils';

import { Notice } from '#stops/Notice';
import { Silence } from '#stops/Silence';
import { PublishDefault } from '#subscribers/publishDefault';

import type { InteractionDispatch } from '#src/dispatch/DispatchContext';
import type { Bus } from '#subscribers/Bus';
import type { DispatchOutcome } from '#subscribers/types/Subscriptions';

let dispatchLogger: Logger | undefined;
function logger(): Logger {
    dispatchLogger ??= new Logger('Dispatch', { channel: 'interactions' });
    return dispatchLogger;
}

export function outcomeFor(caught: unknown): Exclude<DispatchOutcome, 'handled'> {
    if (caught instanceof Silence) return 'refused';
    if (caught instanceof Notice) return caught.report ? 'failed' : 'refused';
    return 'failed';
}

interface DispatchReport {
    readonly dispatch: InteractionDispatch;
    readonly interactionId: string;
    readonly outcome: DispatchOutcome;
    readonly userId: string;
    readonly guildId: string | null;
    readonly startedAt: number;
    readonly queuedMs: number;
}

export function queuedMsFor(interactionId: string): number {
    // timestampFromSnowflake throws on a malformed id
    try {
        return Date.now() - timestampFromSnowflake(interactionId);
    } catch {
        return 0;
    }
}

export function reportDispatch(bus: Bus, report: DispatchReport): void {
    const durationMs = performance.now() - report.startedAt;
    bus[PublishDefault]('interactionDispatched', {
        dispatchId: report.dispatch.id,
        routeId: report.dispatch.routeId,
        interactionId: report.interactionId,
        kind: report.dispatch.kind,
        outcome: report.outcome,
        fallback: report.dispatch.fallback,
        userId: report.userId,
        guildId: report.guildId,
        durationMs,
        queuedMs: report.queuedMs
    });
    logger().trace(
        `${paint.sky.bold(report.dispatch.routeId)} ${report.outcome} ${paint.mute('in')} ${Math.round(durationMs)}ms`
    );
}
