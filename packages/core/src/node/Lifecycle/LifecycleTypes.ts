import type { TypedExclude } from '@seedcord/types';
import type { IntClosedRange } from 'type-fest';

type LifecycleAction = 'start' | 'complete' | 'error';

type PhaseEvents<Prefix extends string, Phases extends number[]> =
    | `phase:${IntClosedRange<1, Phases['length']>}:${TypedExclude<LifecycleAction, 'error'>}`
    | `${Prefix}:${LifecycleAction}`;

/**
 * Event payload map for a lifecycle. The phase and prefix `start`/`complete` events have an empty
 * payload, and the `${Prefix}:error` event's payload is the thrown error.
 */
export type PhaseEventMap<Prefix extends string, Phases extends number[]> = {
    [K in PhaseEvents<Prefix, Phases>]: K extends `${string}:error` ? readonly [error: unknown] : readonly [];
};

export interface LifecycleTask {
    name: string;
    task: () => Promise<void>;
    timeout: number; // milliseconds
}
