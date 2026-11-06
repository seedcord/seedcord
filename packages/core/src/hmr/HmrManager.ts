// import.meta.hot only really needs types in this file
/// <reference types="vite/client" />
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { Envapter } from 'envapt';

import { KeyedQueue } from '#src/kv/KeyedQueue';

import { getDevChannel, setDevChannel } from './devChannel';
import { wrapHot } from './wrapHot';

import type { CliChannel } from './devChannel';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

// the only raw `import.meta.hot` read in the framework
export function connectDevChannel(): CliChannel | undefined {
    if (import.meta.hot) setDevChannel(wrapHot<SeedcordFrameworkEvents, SeedcordCliEvents>(import.meta.hot));
    return getDevChannel();
}

export class HmrManager {
    private readonly logger = new Logger('HMR', { channel: 'hmr' });
    private readonly listeners = new Set<HmrAware>();
    private readonly saves = new KeyedQueue();

    public init(channel: CliChannel | undefined): void {
        if (!channel) return;

        if (!(Envapter.isDevelopment || Envapter.isTest)) {
            return;
        }

        this.logger.debug('Enabled');
        channel.on('seedcord:hmr', (payload) => void this.saves.run('hmr', () => this.handleUpdate(payload)));
        channel.on('vite:beforeFullReload', () => channel.send('seedcord:full-reload', {}));
    }

    public register(listener: HmrAware): void {
        this.listeners.add(listener);
    }

    private async handleUpdate(event: HmrUpdateEvent): Promise<void> {
        const promises = [...this.listeners].map(async (listener) => {
            try {
                await listener.onHmr(event);
            } catch (error) {
                this.logger.error(`Error handling HMR update in ${paint.sky.bold(listener.constructor.name)}`, error);
            }
        });

        await Promise.all(promises);
    }
}
