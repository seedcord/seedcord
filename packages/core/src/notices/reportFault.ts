import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';

import { Notice } from '#stops/Notice';
import { PublishDefault } from '#subscribers/publishDefault';

import { logUnknownFault } from './logUnknownFault';

import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { Bus } from '#subscribers/Bus';
import type { FaultSource, SubscriptionData } from '#subscribers/types/Subscriptions';
import type { ErrorsConfig, RenderContext } from '@seedcord/types';

// lazy, env binds after this module loads
let faultLogger: Logger | undefined;
function logger(): Logger {
    faultLogger ??= new Logger('Faults', { channel: 'errors' });
    return faultLogger;
}

export interface FaultReport extends Pick<SubscriptionData<'unknownException'>, 'guild' | 'user'> {
    readonly uuid: RenderContext['uuid'];
    readonly dispatch: DispatchContext;
    readonly origin: string;
    readonly source: FaultSource | null;
    readonly metadata: unknown;
}

export function reportFault(bus: Bus, errors: ErrorsConfig | undefined, error: Error, report: FaultReport): void {
    if (error instanceof Notice && !error.report) return;
    const { uuid, dispatch, origin, source, guild, user, metadata } = report;
    const from = { uuid, dispatchId: dispatch.id, origin };
    if (error instanceof Notice) {
        logger().error(`${error.name}: ${paint.mute(uuid)}`, error);
        if (source) {
            bus[PublishDefault]('handledException', { denial: error, ...from, source });
            return;
        }
    } else logUnknownFault(logger(), paint.mute(uuid), error, errors);
    bus[PublishDefault]('unknownException', { ...from, error, guild, user, metadata });
}
