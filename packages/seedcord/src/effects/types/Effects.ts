import type { Nullable } from '@seedcord/types';
import type { UUID } from 'crypto';
import type { Guild, User } from 'discord.js';

/**
 * Default side effects that are always available in the framework.
 */
export interface DefaultEffects {
    /** Triggered when an unhandled exception occurs */
    unknownException: {
        uuid: UUID;
        error: Error;
        guild: Nullable<Guild>;
        user: Nullable<User>;
        metadata?: unknown;
    };
}

/**
 * Custom side effects defined by the application.
 *
 * This interface can be augmented via declaration merging to add
 * type-safe custom effect definitions for emitting custom side effects anywhere in the application.
 *
 * @example
 * ```typescript
 * declare module 'seedcord' {
 *   interface Effects {
 *     'userJoin': { user: User; guild: Guild };
 *     'levelUp': { user: User; level: number; guild: Guild };
 *   }
 * }
 * ```
 */
export interface Effects {}

/**
 * Combined effects interface containing both default and custom side effects.
 */
export interface AllEffects extends DefaultEffects, Effects {}

/**
 * Helper type to extract all available effect event names.
 */
export type EffectKeys = keyof AllEffects;

/**
 * Helper type to get parameters for a specific effect event.
 *
 * @typeParam KeyOfEffects - The effect event name
 */
export type EffectParams<KeyOfEffects extends EffectKeys> = AllEffects[KeyOfEffects];
