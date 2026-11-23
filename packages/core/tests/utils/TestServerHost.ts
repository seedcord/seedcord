import { REST } from '@discordjs/rest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { ServerHost } from '#node/ServerHost';
import { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';

import type { ServerHostConfig } from '@seedcord/types';

export class TestServerHost extends ServerHost<'gateway'> {
    public readonly config: ServerHostConfig;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';

    // justified: ServerHost reads only kv, errors, and server off the config
    constructor(
        shutdown = new CoordinatedShutdown(),
        startup = new CoordinatedStartup(),
        config = {} as ServerHostConfig
    ) {
        super('gateway', shutdown, startup, config.kv);
        // test files run side by side, and a default server would put them all on port 3000
        this.config = { server: { port: false }, ...config };
    }

    public run(): Promise<this> {
        return this.init();
    }

    public static resetHost(): void {
        ServerHost.reset();
    }
}
