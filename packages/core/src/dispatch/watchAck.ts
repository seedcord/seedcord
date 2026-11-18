import { paint } from '@seedcord/errors';
import { Envapter } from 'envapt';

import { InteractionKind } from '#src/metadataKeys';
import { lazyLogger } from '#src/miscellaneous/lazyLogger';

import type { Bus } from '#subscribers/Bus';
import type { SubscriptionData } from '#subscribers/types/Subscriptions';
import type { InteractionDispatch } from './DispatchContext';

// half a second under the 3s discord waits for a first response
// https://docs.discord.com/developers/interactions/receiving-and-responding#responding-to-an-interaction
const SLOW_ACK_MS = 2500;

const logger = lazyLogger('Dispatch', { channel: 'interactions' });

// production doesn't start a timer. isProduction is read per call because the environment binds late
export function watchAck(bus: Bus, dispatch: InteractionDispatch): () => void {
    if (Envapter.isProduction) return () => undefined;

    const timer = setTimeout(() => {
        const advice = dispatch.kind === InteractionKind.Autocomplete ? '' : ' Call defer() before slow work.';
        logger().warn(
            `${paint.sky.bold(dispatch.routeId)} hasn't responded after ${SLOW_ACK_MS}ms, and Discord fails the interaction at 3s.${advice}`
        );
    }, SLOW_ACK_MS);

    const stop = (): void => {
        clearTimeout(timer);
        bus.off('responseAttempted', onWrite);
    };
    const onWrite = ({ dispatchId, outcome }: SubscriptionData<'responseAttempted'>): void => {
        if (dispatchId === dispatch.id && outcome === 'sent') stop();
    };
    bus.on('responseAttempted', onWrite);
    return stop;
}
