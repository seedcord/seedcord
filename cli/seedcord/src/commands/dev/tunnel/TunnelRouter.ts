import { missingCloudflaredHint } from './createTunnelCoordinator';

import type { TunnelCoordinator } from './TunnelCoordinator';
import type { DevEvent } from '../runtime/events';
import type { ResolvedTunnel } from '@core/config/schema';
import type { ILogger } from '@seedcord/types';

export class TunnelRouter {
    private coordinator: TunnelCoordinator | undefined;
    private built = false;

    constructor(
        private readonly make: (tunnel: ResolvedTunnel) => TunnelCoordinator | undefined,
        private readonly logger: ILogger
    ) {}

    // the http host is the only one reporting a port so a gateway run should never show the warn
    public route(tunnel: ResolvedTunnel, event: DevEvent): void {
        if (event.type !== 'server-listening' || tunnel.mode === 'off') return;

        // the config loads per session, after the runner built this
        if (!this.built) {
            this.coordinator = this.make(tunnel);
            this.built = true;
            if (!this.coordinator) this.logger.warn(missingCloudflaredHint(process.platform));
        }

        void this.coordinator?.onPort(event.port, event.healthPath);
    }

    public stop(): Promise<void> {
        return this.coordinator?.stop() ?? Promise.resolve();
    }
}
