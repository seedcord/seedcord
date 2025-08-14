import chalk from 'chalk';

import type { Core } from './Core';
import type { CoordinatedShutdown } from '../services/Lifecycle/CoordinatedShutdown';
import type { CoordinatedStartup, StartupPhase } from '../services/Lifecycle/CoordinatedStartup';
import type { Logger } from '../services/Logger';
import type { Tail } from '@seedcord/types';

export interface Initializeable {
  init(): Promise<void>;
}

export abstract class Plugin implements Initializeable {
  public abstract logger: Logger;
  constructor(protected pluggable: Core) {}
  abstract init(): Promise<void>;
}

/** A plugin constructor can accept any tail of args after Core */
export type PluginCtor<TPlugin extends Plugin = Plugin> = new (core: Core, ...args: any[]) => TPlugin;

/** Convenience: the argument list a given constructor expects */
export type PluginArgs<Ctor extends PluginCtor> = Tail<ConstructorParameters<Ctor>>;

export class Pluggable {
  protected isInitialized = false;
  protected readonly shutdown: CoordinatedShutdown;
  protected readonly startup: CoordinatedStartup;

  private static readonly PLUGIN_INIT_TIMEOUT_MS = 15000;

  constructor(shutdown: CoordinatedShutdown, startup: CoordinatedStartup) {
    this.shutdown = shutdown;
    this.startup = startup;
  }

  protected async init(): Promise<this> {
    if (this.isInitialized) return this;

    await this.startup.run();
    this.isInitialized = true;

    return this;
  }

  public attach<Key extends string, Ctor extends PluginCtor>(
    this: this,
    key: Key,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Plugin: Ctor,
    startupPhase: StartupPhase,
    ...args: PluginArgs<Ctor>
  ): this & Record<Key, InstanceType<Ctor>> {
    if (this.isInitialized) throw new Error('Cannot attach a plugin after initialization.');
    if ((this as Record<string, unknown>)[key]) throw new Error(`Plugin with key "${key}" already exists.`);

    const instance = new Plugin(this as unknown as Core, ...args);

    const entry = {
      [key]: instance
    } as Record<Key, InstanceType<Ctor>>;

    this.startup.addTask(
      startupPhase,
      `Plugin:${key}`,
      async () => {
        instance.logger.info(chalk.bold('Initializing'));
        await instance.init();
        instance.logger.info(chalk.bold('Initialized'));
      },
      Pluggable.PLUGIN_INIT_TIMEOUT_MS
    );

    return Object.assign(this, entry);
  }
}
