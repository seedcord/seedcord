import { missingCloudflaredHint } from './createTunnelCoordinator';

import type { TunnelCoordinator } from './TunnelCoordinator';
import type { DevEvent } from '../runtime/events';
import type { ILogger } from '@seedcord/types';

export class TunnelRouter {
    private warned = false;

    constructor(
        private readonly coordinator: TunnelCoordinator | undefined,
        private readonly logger: ILogger
    ) {}

    // the http host is the only one reporting a port, so a gateway run never reaches the warn
    public route(enabled: boolean, event: DevEvent): void {
        if (event.type !== 'server-listening' || !enabled) return;

        if (!this.coordinator) {
            if (this.warned) return;
            this.warned = true;
            this.logger.warn(missingCloudflaredHint(process.platform));
            return;
        }

        void this.coordinator.onPort(event.port);
    }

    public stop(): Promise<void> {
        return this.coordinator?.stop() ?? Promise.resolve();
    }
}
