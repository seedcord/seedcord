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
        this.logger.debug('Enabled');
        channel.on('seedcord:hmr', (payload) => void this.saves.run('hmr', () => this.handleUpdate(payload)));
        channel.on('vite:beforeFullReload', () => channel.send('seedcord:full-reload', {}));
    }

    // only seedcord dev opens a channel, and it only reloads files in the development and test modes
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

    // until the bot asks for these files, the CLI shows its restart card when you save a file that the bot file imports
    public reloadPlugins(plugins: Pick<ReloadablePlugins, 'attachments' | 'replace'>): void {
        // an edge bot runs its startup again when the first run fails
        if (this.plugins) return;

        const reloader = new PluginReloader({ ...plugins, listeners: this });
        this.plugins = reloader;
        // on the same queue as the updates because the reloader has to read these files before you save one of them
        this.channel.on('seedcord:bot-imports', ({ files }) => void this.saves.run('hmr', () => reloader.learn(files)));
        this.channel.send('seedcord:read-bot-imports', {});
    }

    private async handleUpdate(save: HmrSave): Promise<void> {
        // the plugins go first. if the listeners ran first, a replaced plugin's old instance would get this update too
        if (save.botImports && !(await this.plugins?.reload(save.botImports))) {
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
