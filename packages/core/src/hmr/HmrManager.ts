// scoped here so import.meta.hot stays untyped in the rest of the package
/// <reference types="vite/client" />
import { Logger } from '@seedcord/logger';
import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';
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
            this.logger.info('Enabled');

            channel.on('seedcord:hmr', (payload) => {
                const affected = payload.affectedModules?.length ?? 0;
                this.logger.info(`${chalk.bold('1')} module changed, ${chalk.bold(affected)} affected modules`);

                if (payload.affectedModules) {
                    this.logger.utils.list(
                        payload.affectedModules.map((mod) => formatFilePath(mod)),
                        'Affected modules: '
                    );
                }

                void this.handleUpdate(payload);
            });
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
                this.logger.error(`Error handling HMR update in ${chalk.bold(listener.name)}: `, error);
            }
        });

        await Promise.all(promises);
    }
}
