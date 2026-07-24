import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { PluginNeed } from './options';
import type { Logger } from '@seedcord/logger';
import type { Config, Store } from '@seedcord/types';

/**
 * The type each `ctx` capability resolves to. Empty in core, each transport augments it through
 * declaration merging.
 *
 * @example
 * ```typescript
 * declare module '@seedcord/core' {
 *   interface PluginCapabilityTypes {
 *     client: Client;
 *     rest: REST;
 *   }
 * }
 * ```
 */
export interface PluginCapabilityTypes {}

type CapabilityType<Key extends PluginNeed, Fallback> = Key extends keyof PluginCapabilityTypes
    ? PluginCapabilityTypes[Key]
    : Fallback;

type CapabilityValue<TNeeds extends PluginNeed, Key extends PluginNeed, Value> = Key extends TNeeds ? Value : never;

/**
 * The framework surface a plugin reads through `this.ctx`, typed by its declared `needs`.
 *
 * Always available: `logger`, `config`, `store`. Each capability resolves to its value only when
 * the plugin declared that key, otherwise `never`.
 *
 * @typeParam TNeeds - The plugin's declared `needs` union.
 */
export interface PluginContext<TNeeds extends PluginNeed = never> {
    readonly logger: Logger;
    readonly config: Config;
    readonly store: Store<'charge'>;
    readonly client: CapabilityValue<TNeeds, 'client', CapabilityType<'client', unknown>>;
    readonly token: CapabilityValue<TNeeds, 'token', string>;
    /**
     * The REST client. On http, the client has no token until the Ready phase, so a call from
     * `init()` sends without a token and returns a 401.
     */
    readonly rest: CapabilityValue<TNeeds, 'rest', CapabilityType<'rest', unknown>>;
}

// the conditional capability types make PluginContext<A> and PluginContext<B> mutually unassignable
/** @internal */
export type StoredPluginContext = Pick<PluginContext, 'logger' | 'config' | 'store'> & {
    client?: unknown;
    token?: string | undefined;
    rest?: unknown;
};

/**
 * The capability arms a transport supplies from its own Bot/client. `attach` merges them into each
 * plugin's ctx.
 *
 * @internal
 */
export interface PluginCapabilities {
    readonly client?: unknown;
    readonly token?: string | undefined;
    readonly rest?: unknown;
}

/** @internal unset until attach installs the built ctx */
export const pluginContextSlot = Symbol('seedcord.plugin.ctx');

interface ContextHolder {
    [pluginContextSlot]?: StoredPluginContext;
}

/** @internal */
export function readPluginContext<TNeeds extends PluginNeed>(holder: ContextHolder): PluginContext<TNeeds> {
    const ctx = holder[pluginContextSlot];
    if (!ctx) throw new SeedcordError(SeedcordErrorCode.PluginContextBeforeInit, [holder.constructor.name]);
    // safe, finalizePluginContext set the ctx typed for this plugin's declared needs
    return ctx as PluginContext<TNeeds>;
}

/** @internal */
export function finalizePluginContext<TNeeds extends PluginNeed>(
    holder: ContextHolder,
    ctx: PluginContext<TNeeds>
): void {
    holder[pluginContextSlot] = ctx;
}
