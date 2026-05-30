import type { TypedExclude } from '@seedcord/types';
import type { IntClosedRange } from 'type-fest';

/** Actions that can occur during lifecycle phases */
type LifecycleAction = 'start' | 'complete' | 'error';

/**
 * Creates event names for lifecycle managers with phase numbers and actions
 * @typeParam Prefix - The prefix string for lifecycle events
 * @typeParam Phases - Array of phase numbers to generate events for
 */
export type PhaseEvents<Prefix extends string, Phases extends number[]> =
    | `phase:${IntClosedRange<1, Phases['length']>}:${TypedExclude<LifecycleAction, 'error'>}`
    | `${Prefix}:${LifecycleAction}`;

/**
 * Strict-event-emitter payload map for a lifecycle: phase + prefix `start`/`complete` events
 * carry no payload; the `${Prefix}:error` event carries the thrown error.
 * @typeParam Prefix - The prefix string for lifecycle events
 * @typeParam Phases - Array of phase numbers to generate events for
 */
export type PhaseEventMap<Prefix extends string, Phases extends number[]> = {
    [K in PhaseEvents<Prefix, Phases>]: K extends `${string}:error` ? readonly [error: unknown] : readonly [];
};

/** Base interface for a lifecycle task */
export interface LifecycleTask {
    /** Name of the task */
    name: string;
    /** Function to execute the task */
    task: () => Promise<void>;
    /** Timeout for the task */
    timeout: number; // timeout in milliseconds
}
