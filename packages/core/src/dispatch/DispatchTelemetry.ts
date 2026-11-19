import { paint } from '@seedcord/errors';
import { timestampFromSnowflake } from '@seedcord/utils';
import { Envapter } from 'envapt';

import { ACK_DEADLINE_MS } from '#reply/ackLegality';
import { InteractionKind } from '#src/metadataKeys';
import { lazyLogger } from '#src/miscellaneous/lazyLogger';
import { PublishDefault } from '#subscribers/publishDefault';

import type { Bus } from '#subscribers/Bus';
import type { DispatchOutcome, SubscriptionData } from '#subscribers/types/Subscriptions';
import type { InteractionRunConfig } from './InteractionRun';

// half a second of notice before discord fails the interaction
const ACK_NOTICE_MS = 500;
const SLOW_ACK_MS = ACK_DEADLINE_MS - ACK_NOTICE_MS;

const logger = lazyLogger('Dispatch', { channel: 'interactions' });

type DispatchSource = Pick<InteractionRunConfig, 'dispatch' | 'interactionId' | 'origin'>;

function queuedMsFor(interactionId: string): number {
    // timestampFromSnowflake throws on a malformed id
    try {
        return Date.now() - timestampFromSnowflake(interactionId);
    } catch {
        return 0;
    }
}

// publishes the start and end of one interaction dispatch, and warns in dev when it's slow to respond
export class DispatchTelemetry {
    private readonly startedAt = performance.now();
    private readonly queuedMs: number;
    private readonly stopAckWatch: () => void;

    private constructor(
        private readonly bus: Bus,
        private readonly source: DispatchSource
    ) {
        this.queuedMs = queuedMsFor(source.interactionId);
        this.bus[PublishDefault]('interactionDispatching', this.dispatchFields());
        this.stopAckWatch = this.watchAck();
    }

    public static start(bus: Bus, source: DispatchSource): DispatchTelemetry {
        return new DispatchTelemetry(bus, source);
    }

    public finish(outcome: DispatchOutcome): void {
        this.stopAckWatch();
        const { origin, dispatch } = this.source;
        const durationMs = performance.now() - this.startedAt;
        this.bus[PublishDefault]('interactionDispatched', {
            ...this.dispatchFields(),
            outcome,
            userId: origin.userId,
            guildId: origin.guildId,
            durationMs,
            queuedMs: this.queuedMs
        });
        logger().trace(
            `${paint.sky.bold(dispatch.routeId)} ${outcome} ${paint.mute('in')} ${Math.round(durationMs)}ms`
        );
    }

    private dispatchFields(): SubscriptionData<'interactionDispatching'> {
        const { dispatch, interactionId } = this.source;
        return {
            dispatchId: dispatch.id,
            routeId: dispatch.routeId,
            interactionId,
            kind: dispatch.kind,
            fallback: dispatch.fallback
        };
    }

    private watchAck(): () => void {
        // isProduction is read per call because the environment binds late
        if (Envapter.isProduction) return () => undefined;
        const { dispatch } = this.source;

        // discord's clock starts when it creates the interaction. a host clock behind discord's makes queuedMs negative
        const waited = Math.max(0, this.queuedMs);
        const timer = setTimeout(() => this.warnSlowAck(), Math.max(0, SLOW_ACK_MS - waited));
        const stop = (): void => {
            clearTimeout(timer);
            this.bus.off('responseAttempted', onWrite);
        };
        const onWrite = ({ dispatchId, outcome }: SubscriptionData<'responseAttempted'>): void => {
            if (dispatchId === dispatch.id && outcome === 'sent') stop();
        };
        this.bus.on('responseAttempted', onWrite);
        return stop;
    }

    private warnSlowAck(): void {
        const { dispatch } = this.source;
        const deadline = `${ACK_DEADLINE_MS / 1000}s`;
        const advice = dispatch.kind === InteractionKind.Autocomplete ? '' : ' Call defer() before slow work.';
        logger().warn(
            `${paint.sky.bold(dispatch.routeId)} hasn't responded within ${SLOW_ACK_MS}ms of Discord creating it. Discord fails it at ${deadline}.${advice}`
        );
    }
}
