import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { PluginNeed } from './options';
import type { Logger } from '@seedcord/logger';
import type { Config, Store } from '@seedcord/types';

/**
 * The capability types a `ctx` conditional field resolves to. Core defines them `unknown`. Each
 * transport augments its arms through declaration merging.
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
export interface PluginCapabilityTypes {
    client: unknown;
    rest: unknown;
}

type CapabilityValue<TNeeds extends PluginNeed, Key extends PluginNeed, Value> = Key extends TNeeds ? Value : never;

/**
 * The framework surface a plugin reads through `this.ctx`, typed by its declared `needs`.
 *
 * Always available: `logger`, `config`, `store`. Each capability arm resolves to its value only when
 * the plugin declared that key, otherwise `never`.
 *
 * @typeParam TNeeds - The plugin's declared `needs` union.
 */
export interface PluginContext<TNeeds extends PluginNeed = never> {
    readonly logger: Logger;
    readonly config: Config;
    readonly store: Store<'charge'>;
    readonly client: CapabilityValue<TNeeds, 'client', PluginCapabilityTypes['client']>;
    readonly token: CapabilityValue<TNeeds, 'token', string>;
    readonly rest: CapabilityValue<TNeeds, 'rest', PluginCapabilityTypes['rest']>;
}

// the conditional arms make PluginContext<A> and PluginContext<B> mutually unassignable, so the slot stores an optional-arm shape
/** @internal */
export type StoredPluginContext = Pick<PluginContext, 'logger' | 'config' | 'store'> & {
    client?: unknown;
    token?: string;
    rest?: unknown;
};

/** @internal unset until attach installs the built ctx */
export const pluginContextSlot = Symbol('seedcord.plugin.ctx');

interface ContextHolder {
    [pluginContextSlot]?: StoredPluginContext;
}

/** @internal */
export function readPluginContext<TNeeds extends PluginNeed>(holder: ContextHolder): PluginContext<TNeeds> {
    const ctx = holder[pluginContextSlot];
    if (!ctx) throw new SeedcordError(SeedcordErrorCode.PluginContextBeforeInit, [holder.constructor.name]);
    // finalizePluginContext built it for this plugin's declared needs
    return ctx as PluginContext<TNeeds>;
}

/** @internal */
export function finalizePluginContext<TNeeds extends PluginNeed>(
    holder: ContextHolder,
    ctx: PluginContext<TNeeds>
): void {
    holder[pluginContextSlot] = ctx;
}
