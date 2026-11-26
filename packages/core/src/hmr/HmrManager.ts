// import.meta.hot only really needs types in this file
/// <reference types="vite/client" />
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { KeyedQueue } from '@seedcord/utils/internal';
import { Envapter } from 'envapt';

import { getDevChannel, setDevChannel } from './devChannel';
import { PluginReloader } from './PluginReloader';
import { wrapHot } from './wrapHot';

import type { InFlight } from '#src/lifecycle/InFlight';
import type { CliChannel } from './devChannel';
import type { ReloadablePlugins } from './PluginReloader';
import type { HmrAware } from '@seedcord/types';
import type { HmrSave, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

// the only raw `import.meta.hot` read in the framework
export function connectDevChannel(): CliChannel | undefined {
    if (import.meta.hot) setDevChannel(wrapHot<SeedcordFrameworkEvents, SeedcordCliEvents>(import.meta.hot));
    return getDevChannel();
}

// long enough for a handler to answer inside discord's 3s deadline
export const RELOAD_PAUSE_MS = 5000;

export class HmrManager {
    private readonly logger = new Logger('HMR', { channel: 'hmr' });
    private readonly listeners = new Set<HmrAware>();
    private readonly saves = new KeyedQueue();
    private readonly gates = new Set<InFlight>();
    private plugins?: PluginReloader;
    private stopped = false;

    private constructor(private readonly channel: CliChannel) {
        this.logger.debug('Enabled');
        channel.on('seedcord:hmr', (payload) => void this.saves.run('hmr', () => this.handleUpdate(payload)));
        channel.on('vite:beforeFullReload', () => channel.send('seedcord:full-reload', {}));
    }

    // only seedcord dev opens a channel. even then, files reload only in development and test mode
    public static listenTo(channel: CliChannel | undefined): HmrManager | undefined {
        if (!channel || !(Envapter.isDevelopment || Envapter.isTest)) return undefined;
        return new HmrManager(channel);
    }

    public register(listener: HmrAware): void {
        this.listeners.add(listener);
    }

    public unregister(listener: HmrAware): void {
        this.listeners.delete(listener);
    }

    // new requests and events wait at this gate while a save swaps plugins
    public pauseDuringReloads(gate: InFlight): void {
        this.gates.add(gate);
    }

    // shutdown waits for this so it doesn't dispose plugins while a save is still starting one
    public async stop(): Promise<void> {
        this.stopped = true;
        await this.saves.run('hmr', () => Promise.resolve());
    }

    public reloadPlugins(plugins: ReloadablePlugins): void {
        // an edge bot runs its startup again when the first run fails
        if (this.plugins) return;

        const reloader = new PluginReloader(plugins, this);
        this.plugins = reloader;
        // queued with the updates because learn() has to finish before the next update runs
        this.channel.on(
            'seedcord:bot-imports',
            ({ imports }) => void this.saves.run('hmr', () => reloader.learn(imports))
        );
        this.channel.send('seedcord:read-bot-imports', {});
    }

    public async pauseGates(): Promise<() => void> {
        const resumes = await Promise.all([...this.gates].map((gate) => gate.pause(RELOAD_PAUSE_MS)));
        return () => {
            for (const resume of resumes) resume();
        };
    }

    private async handleUpdate({ botImports, ...update }: HmrSave): Promise<void> {
        if (this.stopped) return;
        // plugins go first so a replaced plugin's old instance doesn't get this update
        if (botImports && !(await this.plugins?.reloadedWithoutRestart(botImports))) {
            this.channel.send('seedcord:restart-required', { file: update.file });
            return;
        }

        const promises = [...this.listeners].map(async (listener) => {
            try {
                await listener.onHmr(update);
            } catch (error) {
                this.logger.error(`Error handling HMR update in ${paint.sky.bold(listener.constructor.name)}`, error);
            }
        });

        await Promise.all(promises);
    }
}
