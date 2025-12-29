import { HMR_EVENT_NAME } from '@seedcord/cli';
import { Logger } from '@seedcord/services';

import type { HmrAware, HmrUpdateEvent } from '@seedcord/cli';

export class HmrManager {
    private readonly logger = new Logger('HMR');
    private readonly listeners = new Set<HmrAware>();

    constructor() {}

    public init(): void {
        if (import.meta.hot) {
            this.logger.inChannel('hmr').info('HMR enabled');

            import.meta.hot.on(HMR_EVENT_NAME, (payload: HmrUpdateEvent) => {
                this.logger.inChannel('hmr').debug(`Received HMR update for ${payload.file} (${payload.type})`);
                if (payload.affectedModules) {
                    this.logger.inChannel('hmr').utils.list(payload.affectedModules);
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
                this.logger
                    .inChannel('hmr')
                    .error(`Error in HMR listener: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        await Promise.all(promises);
    }
}
