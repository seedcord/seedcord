import type { NumberRange, TypedExclude } from './Misc';

export type LifecycleAction = 'start' | 'complete' | 'error';

export type PhaseEvents<Prefix extends string, Phases extends number[]> =
  | `phase:${NumberRange<1, Phases['length']>}:${TypedExclude<LifecycleAction, 'error'>}`
  | `${Prefix}:${LifecycleAction}`;

/** Base interface for a lifecycle task */
export interface LifecycleTask {
  name: string;
  task: () => Promise<void>;
  timeout: number; // timeout in milliseconds
}
