import { FixedScope } from '@seedcord/core/internal';
import { Plugin as CorePlugin } from '@seedcord/core/plugin';

import type { Core } from '#interfaces/Core';
import type { PluginOptions } from '@seedcord/core/plugin';
import type { OverrideProperties } from 'type-fest';

/**
 * The options a gateway plugin declares, narrowed to the transport and runtime this base serves.
 * A gateway connection is a websocket that needs a long-lived process.
 */
export type GatewayPluginOptions = OverrideProperties<
    PluginOptions,
    {
        transport?: 'gateway';
        runtime?: 'server';
    }
>;

const GATEWAY_SCOPE = { transport: 'gateway', runtime: 'server' } as const;

/**
 * Base class for a gateway plugin, binding `this.core` to the gateway {@link Core}.
 *
 * To run on either transport, extend the base from `@seedcord/core/plugin`. Its `this.core` has
 * only the shared members.
 *
 * @typeParam Opts - The transport and runtime the plugin declares.
 */
export abstract class Plugin<
    Opts extends GatewayPluginOptions = { transport: 'gateway'; runtime: 'server' }
> extends CorePlugin<Opts, Core, keyof typeof GATEWAY_SCOPE> {
    /** @internal */
    protected static override readonly [FixedScope] = GATEWAY_SCOPE;
}

export type { PluginLifecycleSpec, PluginOptions } from '@seedcord/core/plugin';
