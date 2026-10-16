// scoped here so import.meta.hot stays untyped in the rest of the package
/// <reference types="vite/client" />
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { Envapter } from 'envapt';

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

    public init(channel: CliChannel | undefined): void {
        if (!channel) return;

        if (!(Envapter.isDevelopment || Envapter.isTest)) {
            return;
        }

        this.logger.debug('Enabled');
        channel.on('seedcord:hmr', (payload) => void this.handleUpdate(payload));
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
