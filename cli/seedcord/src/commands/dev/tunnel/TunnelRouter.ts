import { missingCloudflaredHint } from './createTunnelCoordinator';

import type { ResolvedTunnel } from '#core/config/schema';
import type { TunnelCoordinator } from './TunnelCoordinator';
import type { ILogger } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';

function same(a: ResolvedTunnel | undefined, b: ResolvedTunnel): boolean {
    if (a?.mode !== b.mode) return false;
    return a.mode === 'url' && b.mode === 'url' ? a.url === b.url : true;
}

export class TunnelRouter {
    private coordinator: TunnelCoordinator | undefined;
    private built: ResolvedTunnel | undefined;

    constructor(
        private readonly make: (tunnel: ResolvedTunnel) => TunnelCoordinator | undefined,
        private readonly logger: ILogger
    ) {}

    // the dev session calls this from a sync callback where a rejection would end up unhandled
    public route(tunnel: ResolvedTunnel, port: number, instance: SeedcordInstance): Promise<void> {
        return this.routeTo(tunnel, port, instance).catch((error: unknown) => {
            this.logger.error('Tunnel setup failed, the bot runs without a public endpoint', error);
        });
    }

    private async routeTo(tunnel: ResolvedTunnel, port: number, instance: SeedcordInstance): Promise<void> {
        // each restart reloads the config
        if (!same(this.built, tunnel)) {
            // clearing the old endpoint must finish before the replacement sets its own
            await this.stop();
            this.built = tunnel;
            this.coordinator = tunnel.mode === 'off' ? undefined : this.make(tunnel);
            if (tunnel.mode !== 'off' && !this.coordinator) {
                this.logger.warn(missingCloudflaredHint(process.platform));
            }
        }

        await this.coordinator?.onPort(port, instance);
    }

    // a rejection here would go unreported on the quit path
    public stop(): Promise<void> {
        const running = this.coordinator;
        this.coordinator = undefined;
        return (
            running?.stop().catch((error: unknown) => {
                this.logger.warn('Could not stop the tunnel', error);
            }) ?? Promise.resolve()
        );
    }
}
