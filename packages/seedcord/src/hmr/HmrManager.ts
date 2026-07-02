import { Logger } from '@seedcord/services';
import { wrapHot } from '@seedcord/types/internal';
import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';
import { Envapter } from 'envapt';

import { getDevChannel, setDevChannel } from './devChannel';

import type { HmrAware, HmrUpdateEvent, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

export class HmrManager {
    private readonly logger = new Logger('HMR', { channel: 'hmr' });
    private readonly listeners = new Set<HmrAware>();

    constructor() {}

    /** @internal */
    public init(): void {
        if (!import.meta.hot) return;
        // the one raw `import.meta.hot` read in the framework, captured into the dev-channel singleton
        // so every other framework site reads it through getDevChannel
        setDevChannel(wrapHot<SeedcordFrameworkEvents, SeedcordCliEvents>(import.meta.hot));

        if (Envapter.isDevelopment || Envapter.isTest) {
            this.logger.info('Enabled');

            getDevChannel()?.on('seedcord:hmr', (payload) => {
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
