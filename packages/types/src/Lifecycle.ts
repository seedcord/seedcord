import type { NumberRange, TypedExclude } from './Misc';

/** Actions that can occur during lifecycle phases */
export type LifecycleAction = 'start' | 'complete' | 'error';

/**
 * Creates event names for lifecycle managers with phase numbers and actions
 * @param Prefix - The prefix string for lifecycle events
 * @param Phases - Array of phase numbers to generate events for
 */
export type PhaseEvents<Prefix extends string, Phases extends number[]> =
  | `phase:${NumberRange<1, Phases['length']>}:${TypedExclude<LifecycleAction, 'error'>}`
  | `${Prefix}:${LifecycleAction}`;

/** Base interface for a lifecycle task */
export interface LifecycleTask {
  /** Name of the task */
  name: string;
  /** Function to execute the task */
  task: () => Promise<void>;
  /** Timeout for the task */
  timeout: number; // timeout in milliseconds
}
