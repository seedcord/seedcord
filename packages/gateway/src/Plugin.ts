import { Plugin as CorePlugin } from '@seedcord/core/plugin';

import type { Core } from '#interfaces/Core';
import type { PluginOptions } from '@seedcord/core/plugin';
import type { TypedOmit } from '@seedcord/types';

/**
 * The options a gateway plugin declares, narrowed to the transport and runtime this base serves.
 * A gateway connection is a websocket that needs a long-lived process.
 */
export type GatewayPluginOptions = TypedOmit<PluginOptions, 'transport' | 'runtime'> & {
    transport?: 'gateway';
    runtime?: 'server';
};

/**
 * Base class for a gateway plugin, binding `this.core` to the gateway {@link Core}.
 *
 * A plugin that runs on either transport extends the base from `@seedcord/core/plugin`, whose
 * `this.core` is typed to the shared members only.
 *
 * @typeParam Opts - The transport and runtime the plugin declares.
 */
export abstract class Plugin<
    Opts extends GatewayPluginOptions = { transport: 'gateway'; runtime: 'server' }
> extends CorePlugin<Opts, Core> {}

export type { PluginLifecycleSpec, PluginOptions } from '@seedcord/core/plugin';
