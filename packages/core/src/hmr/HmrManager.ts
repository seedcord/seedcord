// import.meta.hot only really needs types in this file
/// <reference types="vite/client" />
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { KeyedQueue } from '@seedcord/utils/internal';
import { Envapter } from 'envapt';

import { getDevChannel, setDevChannel } from './devChannel';
import { PluginReloader } from './PluginReloader';
import { wrapHot } from './wrapHot';

import type { CliChannel } from './devChannel';
import type { ReloadablePlugins } from './PluginReloader';
import type { HmrAware } from '@seedcord/types';
import type { HmrSave, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';
import type { Except } from 'type-fest';

// the only raw `import.meta.hot` read in the framework
export function connectDevChannel(): CliChannel | undefined {
    if (import.meta.hot) setDevChannel(wrapHot<SeedcordFrameworkEvents, SeedcordCliEvents>(import.meta.hot));
    return getDevChannel();
}

export class HmrManager {
    private readonly logger = new Logger('HMR', { channel: 'hmr' });
    private readonly listeners = new Set<HmrAware>();
    private readonly saves = new KeyedQueue();
    private plugins?: PluginReloader;

    private constructor(private readonly channel: CliChannel) {
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

    public reloadPlugins(plugins: Except<ReloadablePlugins, 'listeners'>): void {
        // an edge bot runs its startup again when the first run fails
        if (this.plugins) return;

        // logged here because the edge bot builds this manager before it forwards logs to the CLI
        this.logger.debug('Enabled');
        const reloader = new PluginReloader({ ...plugins, listeners: this });
        this.plugins = reloader;
        // queued with the updates because learn() has to finish before the next update runs
        this.channel.on(
            'seedcord:bot-imports',
            ({ imports }) => void this.saves.run('hmr', () => reloader.learn(imports))
        );
        this.channel.send('seedcord:read-bot-imports', {});
    }

    private async handleUpdate(save: HmrSave): Promise<void> {
        // plugins go first so a replaced plugin's old instance doesn't get this update
        if (save.botImports && !(await this.plugins?.reloadedWithoutRestart(save.botImports))) {
            this.channel.send('seedcord:restart-required', { file: save.file });
        }

        const promises = [...this.listeners].map(async (listener) => {
            try {
                await listener.onHmr(save);
            } catch (error) {
                this.logger.error(`Error handling HMR update in ${paint.sky.bold(listener.constructor.name)}`, error);
            }
        });

        await Promise.all(promises);
    }
}
