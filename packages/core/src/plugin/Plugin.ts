import { TypedEventEmitter } from '@seedcord/event-emitter';

import { getDevChannel } from '@hmr/devChannel';

import type { CoreBase } from '@interfaces/CoreBase';
import type { EventMap, NoEvents } from '@seedcord/event-emitter';
import type { Logger } from '@seedcord/logger';
import type { Tail, HmrAware, HmrUpdateEvent } from '@seedcord/types';

export interface Initializeable {
    init(): Promise<void>;
}

/**
 * Base class for Seedcord plugins. A subclass redeclares its transport's own `Core` on the
 * constructor and implements `init()`.
 */
export abstract class Plugin<TPluginEvents extends EventMap<TPluginEvents> = NoEvents>
    extends TypedEventEmitter<TPluginEvents>
    implements Initializeable, HmrAware
{
    public abstract logger: Logger;

    public name: string = this.constructor.name;

    // subclasses redeclare the transport's own Core type on their constructor
    constructor(protected pluggable: CoreBase) {
        super();
    }

    abstract init(): Promise<void>;

    /**
     * Reloads plugin state on an HMR update. The base implementation is a no-op, override it in your plugin.
     * @virtual
     */
    public onHmr(_event: HmrUpdateEvent): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Registers critical file patterns that should trigger a full restart when changed in Dev HMR.
     * @param patterns - Glob patterns relative to the project root
     */
    protected registerCriticalFiles(patterns: string[]): void {
        getDevChannel()?.send('seedcord:register-critical-files', { patterns });
    }

    /** @internal */
    override removeListener<TEventKey extends Extract<keyof TPluginEvents, string | symbol>>(
        event: TEventKey,
        listener: (...args: TPluginEvents[TEventKey]) => void
    ): this {
        return super.removeListener(event, listener);
    }

    /** @internal */
    override removeAllListeners(event?: Extract<keyof TPluginEvents, string | symbol>): this {
        return super.removeAllListeners(event);
    }
}

/**
 * Constructor type for plugins that can accept extra arguments after Core.
 *
 * The first parameter stays untyped here. Subclasses declare their transport's own `Core`, and a
 * `CoreBase` parameter would reject them (construct-signature params check contravariantly). The
 * `Plugin` base constructor carries the real contract, and attach call sites still infer the
 * concrete subclass tuple for the trailing args.
 *
 * @internal
 */
export type PluginCtor<TPlugin extends Plugin = Plugin> = new (...args: any[]) => TPlugin;

/**
 * Extracts the argument types for a plugin constructor, excluding the Core parameter.
 *
 * @internal
 */
export type PluginArgs<Ctor extends PluginCtor> = Tail<ConstructorParameters<Ctor>>;
