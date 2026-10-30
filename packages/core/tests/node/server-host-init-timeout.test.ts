import { Logger } from '@seedcord/logger';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import { Plugin } from '#src/plugin/Plugin';
import { TestServerHost } from '#tests/utils/TestServerHost';

import type { CoreBase } from '#interfaces/CoreBase';

const INIT_TIMEOUT_MS = 10;
const CLAIM_MS = 40;
const SETTLE_MS = 90;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

class SlowClaim extends Plugin {
    public claimHeld = false;
    public disposeCalls = 0;

    constructor(core: CoreBase) {
        super(core, { init: { timeout: INIT_TIMEOUT_MS } });
    }

    public async init(): Promise<void> {
        await delay(CLAIM_MS);
        this.claimHeld = true;
    }

    public override dispose(): Promise<void> {
        this.disposeCalls++;
        this.claimHeld = false;
        return Promise.resolve();
    }
}

function makeHost(): TestServerHost {
    return new TestServerHost(new CoordinatedShutdown(), new CoordinatedStartup());
}

describe('a plugin whose init outlasts its timeout', () => {
    afterEach(() => {
        TestServerHost.resetHost();
        vi.restoreAllMocks();
    });

    it('disposes what init opened once init resolves', async () => {
        const host = makeHost();
        const plugin = host.attach('slow', SlowClaim).slow;

        await expect(host.run()).rejects.toThrow();
        await delay(SETTLE_MS);

        expect(plugin.disposeCalls).toBe(1);
        expect(plugin.claimHeld).toBe(false);
    });

    it('logs the error a late init rejects with', async () => {
        class SlowFailure extends SlowClaim {
            public override async init(): Promise<void> {
                await delay(CLAIM_MS);
                throw new Error('late failure');
            }
        }

        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const host = makeHost();
        host.attach('slow', SlowFailure);

        await expect(host.run()).rejects.toThrow();
        await delay(SETTLE_MS);

        const logged = warn.mock.calls.some((call) => call.some((arg) => String(arg).includes('late failure')));
        expect(logged).toBe(true);
    });

    it('treats an immediate init rejection as a plain failure', async () => {
        class FastFailure extends SlowClaim {
            public override init(): Promise<void> {
                return Promise.reject(new Error('immediate failure'));
            }
        }

        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const host = makeHost();
        host.attach('slow', FastFailure);

        await expect(host.run()).rejects.toThrow();
        await delay(SETTLE_MS);

        expect(warn).not.toHaveBeenCalled();
    });

    it('logs a late rejection from a plugin that declares no dispose', async () => {
        class NoDispose extends Plugin {
            constructor(core: CoreBase) {
                super(core, { init: { timeout: INIT_TIMEOUT_MS } });
            }

            public async init(): Promise<void> {
                await delay(CLAIM_MS);
                throw new Error('late failure');
            }
        }

        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const host = makeHost();
        host.attach('slow', NoDispose);

        await expect(host.run()).rejects.toThrow();
        await delay(SETTLE_MS);

        const logged = warn.mock.calls.some((call) => call.some((arg) => String(arg).includes('late failure')));
        expect(logged).toBe(true);
    });

    it('stays quiet when a late init fulfils on a plugin that declares no dispose', async () => {
        class NoDisposeSlow extends Plugin {
            constructor(core: CoreBase) {
                super(core, { init: { timeout: INIT_TIMEOUT_MS } });
            }

            public async init(): Promise<void> {
                await delay(CLAIM_MS);
            }
        }

        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const host = makeHost();
        host.attach('slow', NoDisposeSlow);

        await expect(host.run()).rejects.toThrow();
        await delay(SETTLE_MS);

        expect(warn).not.toHaveBeenCalled();
    });

    it('disposes each plugin once across the rollback, the late init, and a shutdown', async () => {
        class QuickClaim extends SlowClaim {
            public override init(): Promise<void> {
                this.claimHeld = true;
                return Promise.resolve();
            }
        }

        const shutdown = new CoordinatedShutdown();
        const host = new TestServerHost(shutdown, new CoordinatedStartup());
        // only the healthy plugin registers a shutdown task
        const healthy = host.attach('healthy', QuickClaim).healthy;
        const late = host.attach('slow', SlowClaim).slow;

        await expect(host.run()).rejects.toThrow();
        await delay(SETTLE_MS);
        await shutdown.run(1, false);

        expect(healthy.disposeCalls).toBe(1);
        expect(late.disposeCalls).toBe(1);
    });
});
