import type { Nullish } from '../../library/types/Miscellaneous';
import type { UUID } from 'crypto';
import type { Guild, User } from 'discord.js';

// Default hooks that are always available in the framework
export interface DefaultHooks {
  unknownException: { uuid: UUID; error: Error; guild: Nullish<Guild>; user: Nullish<User> };
}

// This interface can be augmented via declaration merging
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Hooks {}

// Combined hooks interface - includes both default and custom hooks
export interface AllHooks extends DefaultHooks, Hooks {}

// Helper type to extract hook keys
export type HookKeys = keyof AllHooks;

// Helper type to get parameters for a specific hook
export type HookParams<T extends HookKeys> = AllHooks[T];
