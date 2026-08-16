// scoped here so import.meta.hot stays untyped in the rest of the package
/// <reference types="vite/client" />
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { Envapter } from 'envapt';

import { setDevChannel } from './devChannel';
import { wrapHot } from './wrapHot';

import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

export class HmrManager {
    private readonly logger = new Logger('HMR', { channel: 'hmr' });
    private readonly listeners = new Set<HmrAware>();

    /** @internal */
    public init(): void {
        if (!import.meta.hot) return;
        // the only raw `import.meta.hot` read in the framework
        const channel = wrapHot<SeedcordFrameworkEvents, SeedcordCliEvents>(import.meta.hot);
        setDevChannel(channel);

        if (Envapter.isDevelopment || Envapter.isTest) {
            this.logger.debug('Enabled');
            channel.on('seedcord:hmr', (payload) => void this.handleUpdate(payload));
        }
    }

    /** @internal */
    public register(listener: HmrAware): void {
        this.listeners.add(listener);
    }

    /** @internal */
    public unregister(listener: HmrAware): void {
        this.listeners.delete(listener);
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
