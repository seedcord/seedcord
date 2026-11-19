import { paint } from '@seedcord/errors';
import { asError } from '@seedcord/utils/internal';

import { lazyLogger } from '#src/miscellaneous/lazyLogger';
import { PublishDefault } from '#subscribers/publishDefault';

import type { AttemptedWrite, ResponseAttempt } from '#subscribers/types/Subscriptions';
import type { PendingWrite, ReplyTelemetry, SentWrite } from './responseReport';
import type { DistributedOmit, ExcludeStrict, Promisable } from 'type-fest';

const logger = lazyLogger('Reply', { channel: 'interactions' });

type ResponseReport = DistributedOmit<ResponseAttempt, ExcludeStrict<keyof AttemptedWrite, 'method'>>;

// one write through the reply surface, timed from construction
export class WriteAttempt {
    private readonly startedAt = performance.now();

    public constructor(private readonly telemetry: ReplyTelemetry) {}

    // publishes failed on a throw because a throw skips the caller's sent() after the write
    public async run<Result>(pending: PendingWrite, write: () => Promisable<Result>): Promise<Result> {
        try {
            return await write();
        } catch (caught) {
            this.publish({ ...pending, outcome: 'failed', messageId: null, error: asError(caught) });
            // rethrown raw
            throw caught;
        }
    }

    public sent(sent: SentWrite, messageId: string | null): void {
        this.publish({ ...sent, outcome: 'sent', messageId });
    }

    private publish(report: ResponseReport): void {
        const durationMs = performance.now() - this.startedAt;
        const { bus, dispatch, interactionId } = this.telemetry;
        bus[PublishDefault]('responseAttempted', {
            dispatchId: dispatch.id,
            routeId: dispatch.routeId,
            interactionId,
            durationMs,
            ...report
        });

        // after publish so a throwing sink doesn't reach the publish above
        logger().trace(
            `${paint.sky.bold(dispatch.routeId)} ${report.method} ${report.outcome} ${paint.mute('in')} ${Math.round(durationMs)}ms`
        );
    }
}
