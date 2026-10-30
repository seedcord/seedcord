import { REST } from '@discordjs/rest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { ServerHost } from '#node/ServerHost';
import { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import { Bus } from '#subscribers/Bus';

import type { Config } from '@seedcord/types';

export class TestServerHost extends ServerHost<'gateway'> {
    public readonly config: Config;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';
    public readonly bus: Bus;

    // justified: ServerHost reads only kv and errors off the config
    constructor(
        shutdown = new CoordinatedShutdown(),
        startup = new CoordinatedStartup(),
        config: Config = {} as Config
    ) {
        super('gateway', shutdown, startup, config.kv);
        this.config = config;
        this.bus = new Bus(this);
    }

    public run(): Promise<this> {
        return this.init();
    }

    public static resetHost(): void {
        ServerHost.reset();
    }
}
