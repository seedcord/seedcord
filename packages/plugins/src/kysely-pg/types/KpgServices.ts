import type { KpgService } from '../KpgService';

/**
 * Namespace interface that gets augmented by individual service packages.
 *
 * This interface can be augmented via declaration merging to add
 * type-safe service definitions when using the `@RegisterKpgService` decorator.
 *
 * @example
 * ```typescript
 * declare module '@seedcord/plugins' {
 *   interface KpgServices {
 *     'users': Users;
 *   }
 * }
 * ```
 */
export interface KpgServices {}

/**
 * Union of all registered service keys.
 */
export type KpgServiceKeys = keyof KpgServices;

/**
 * Fallback database shape used when no services have extended the base interface.
 *
 * @internal
 */
export type DefaultKpgDatabase = Record<string, unknown>;

/**
 * Fallback service type used while no concrete services are registered.
 *
 * @internal
 */
export type DefaultKpgService = KpgService<DefaultKpgDatabase, string>;

/**
 * Either a real service from `KpgServices` or the default service placeholder.
 *
 * @internal
 */
export type AnyKpgService = [KpgServiceKeys] extends [never] ? DefaultKpgService : KpgServices[KpgServiceKeys];
