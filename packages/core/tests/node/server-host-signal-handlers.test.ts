import { setDevFiles } from '@seedcord/utils/internal';
import { describe, it, expect, afterEach } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import { TestServerHost } from '#tests/utils/TestServerHost';

import type { Config } from '@seedcord/types';

// justified: startup reads config.errors and nothing else on Config
const config = { errors: { catchProcessErrors: false } } as Config;

function signalHost(): TestServerHost {
    return new TestServerHost(new CoordinatedShutdown(), new CoordinatedStartup(), config);
}

function signalListeners(): [sigterm: number, sigint: number] {
    return [process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')];
}

describe('signal handlers on a plugin host', () => {
    afterEach(() => {
        TestServerHost.resetHost();
    });

    it('installs none while the bot is only constructed', () => {
        const before = signalListeners();

        signalHost();

        expect(signalListeners()).toEqual(before);
    });

    it('installs one SIGTERM and one SIGINT handler on start', async () => {
        const [sigterm, sigint] = signalListeners();
        const host = signalHost();

        await host.run();

        expect(signalListeners()).toEqual([sigterm + 1, sigint + 1]);
    });

    it('installs none on start under seedcord dev, which stops the bot itself', async () => {
        const before = signalListeners();
        using _dev = setDevFiles({ root: process.cwd(), listed: [], skippedFolders: [] });

        await signalHost().run();

        expect(signalListeners()).toEqual(before);
    });

    it('releases them on reset after a start', async () => {
        const before = signalListeners();
        const host = signalHost();
        await host.run();

        TestServerHost.resetHost();

        expect(signalListeners()).toEqual(before);
    });
});
