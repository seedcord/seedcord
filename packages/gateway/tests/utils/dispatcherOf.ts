import { eventsOf } from '#bot/Bot';

import type { Seedcord } from '#src/Seedcord';
import type { InFlight } from '@seedcord/core/node/internal';

interface PrivateEventDispatcher {
    eventMap: Map<string, unknown[]>;
    init(): Promise<void>;
    onHmr(event: unknown): Promise<void>;
    processEvent(eventName: string, args: unknown[]): Promise<void>;
    inFlight: InFlight;
}

export function dispatcherOf(instance: Seedcord): PrivateEventDispatcher {
    // eslint-disable-next-line no-restricted-syntax -- fixture cast, these members are private on the dispatcher
    return eventsOf(instance.bot) as unknown as PrivateEventDispatcher;
}
