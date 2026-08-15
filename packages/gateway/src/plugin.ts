import { Plugin as CorePlugin } from '@seedcord/core/plugin';

import type { Core } from '#interfaces/Core';
import type { PluginOptions } from '@seedcord/core/plugin';
import type { TypedOmit } from '@seedcord/types';

/** The options a gateway plugin declares, narrowed to the transports this base serves. */
export type GatewayPluginOptions = TypedOmit<PluginOptions, 'transport'> & { transport?: 'gateway' | 'any' };

/**
 * Base class for a gateway plugin, binding `this.core` to the gateway {@link Core}.
 *
 * A plugin that runs on either transport extends the base from `@seedcord/core/plugin`, whose
 * `this.core` is typed to the shared members only.
 *
 * @typeParam Opts - The transport and runtime the plugin declares.
 */
export abstract class Plugin<Opts extends GatewayPluginOptions = {}> extends CorePlugin<Opts, Core> {}

export type { PluginLifecycleSpec, PluginOptions } from '@seedcord/core/plugin';
