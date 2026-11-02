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
let cachedLogger: Logger | undefined;
export function faultLogger(): Logger {
    cachedLogger ??= new Logger('Faults', { channel: 'errors' });
    return cachedLogger;
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
        faultLogger().error(`${error.name}: ${paint.mute(uuid)}`, error);
        if (source) {
            bus[PublishDefault]('handledException', { denial: error, ...from, source });
            return;
        }
    } else logUnknownFault(faultLogger(), paint.mute(uuid), error, errors);
    bus[PublishDefault]('unknownException', { ...from, error, guild, user, metadata });
}
