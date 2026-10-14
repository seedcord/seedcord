import { HostShutdown, HostStartup } from '@seedcord/types/internal';

import type { SeedcordInstance } from '@seedcord/types/internal';

export class InstanceLifecycle {
    private instance?: SeedcordInstance;
    private starting?: Promise<unknown>;

    public async start(instance: SeedcordInstance): Promise<string | undefined> {
        this.instance = instance;
        this.starting = Promise.resolve(instance.start());
        await this.starting;
        return instance.username;
    }

    public async stop(): Promise<void> {
        this.instance?.[HostStartup].abort();
        // the shutdown below still runs when startup failed
        try {
            await this.starting;
        } catch {}
        await this.instance?.[HostShutdown].run(0, false);
    }
}
