import { Logger } from '@seedcord/services';
import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';
import { Envapter } from 'envapt';

import type { HmrAware, HmrUpdateEvent } from '@seedcord/types/internal';

export class HmrManager {
    private readonly logger = new Logger('HMR', { channel: 'hmr' });
    private readonly listeners = new Set<HmrAware>();

    constructor() {}

    public init(): void {
        if (import.meta.hot && (Envapter.isDevelopment || Envapter.isTest)) {
            this.logger.info('Enabled');

            import.meta.hot.on('seedcord:hmr', (payload) => {
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

    public register(listener: HmrAware): void {
        this.listeners.add(listener);
    }

    public unregister(listener: HmrAware): void {
        this.listeners.delete(listener);
    }

    private async handleUpdate(event: HmrUpdateEvent): Promise<void> {
        const promises = Array.from(this.listeners).map(async (listener) => {
            try {
                await listener.onHmr(event);
            } catch (error) {
                this.logger.error(`Error handling HMR update in ${chalk.bold(listener.name)}: `, error);
            }
        });

        await Promise.all(promises);
    }
}
