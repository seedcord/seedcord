import { setTimeout as sleep } from 'node:timers/promises';

import { REST } from '@discordjs/rest';
import { afterEach, describe, expect, it } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { ServerHost } from '#node/ServerHost';
import { MemoryDriver } from '#src/kv/MemoryDriver';
import { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import { ShutdownPhase } from '#src/lifecycle/phases';
import { Plugin } from '#src/plugin/Plugin';
import { Bus } from '#subscribers/Bus';

import type { CoreBase } from '#interfaces/CoreBase';
import type { Config, KvDriver } from '@seedcord/types';

class TestHost extends ServerHost<'gateway'> {
    public readonly config = {} as Config;
    public readonly rest = new REST();
    public readonly applicationId = 'app-1';
    public readonly bus: Bus;

    constructor(shutdown: CoordinatedShutdown, driver: KvDriver) {
        super('gateway', shutdown, new CoordinatedStartup(), driver);
        this.bus = new Bus(this);
    }

    public run(): Promise<this> {
        return this.init();
    }

    public static resetHost(): void {
        ServerHost.reset();
    }
}

describe('config.kv at shutdown', () => {
    afterEach(() => {
        TestHost.resetHost();
    });

    it('disposes the driver after a plugin dispose in the last phase finishes', async () => {
        const order: string[] = [];
        class ClosingDriver extends MemoryDriver {
            public override [Symbol.asyncDispose](): Promise<void> {
                order.push('kv closed');
                return super[Symbol.asyncDispose]();
            }
        }
        class LogoutWriter extends Plugin {
            constructor(core: CoreBase) {
                super(core, { dispose: { phase: ShutdownPhase.Logout } });
            }
            public init(): Promise<void> {
                return Promise.resolve();
            }
            public override async dispose(): Promise<void> {
                await sleep(0);
                order.push('plugin disposed');
            }
        }

        const shutdown = new CoordinatedShutdown();
        const host = new TestHost(shutdown, new ClosingDriver()).attach('writer', LogoutWriter);
        await host.run();
        await shutdown.run(0, false);

        expect(order).toEqual(['plugin disposed', 'kv closed']);
    });
});
