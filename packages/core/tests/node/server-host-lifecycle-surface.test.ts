import { HostShutdown, HostStartup } from '@seedcord/types/internal';
import { describe, it, expect, afterEach } from 'vitest';

import { ShutdownPhase, StartupPhase } from '#src/lifecycle/phases';
import { TestServerHost } from '#tests/utils/TestServerHost';

describe('the lifecycle surface a bot author reaches', () => {
    afterEach(() => {
        TestServerHost.resetHost();
    });

    it('carries addTask alone on shutdown', () => {
        const host = new TestServerHost();

        expect(Object.keys(host.shutdown)).toEqual(['addTask']);
        expect('run' in host.shutdown).toBe(false);
        expect('removeTask' in host.shutdown).toBe(false);
        expect('removeSignalHandlers' in host.shutdown).toBe(false);
    });

    it('carries addTask alone on startup', () => {
        const host = new TestServerHost();

        expect(Object.keys(host.startup)).toEqual(['addTask']);
        expect('run' in host.startup).toBe(false);
        expect('abort' in host.startup).toBe(false);
    });

    it('registers a shutdown task on the real lifecycle', () => {
        const host = new TestServerHost();

        host.shutdown.addTask(ShutdownPhase.Drain, 'probe', () => Promise.resolve());

        expect(host[HostShutdown].removeTask(ShutdownPhase.Drain, 'probe')).toBe(true);
    });

    it('registers a startup task on the real lifecycle', () => {
        const host = new TestServerHost();

        host.startup.addTask(StartupPhase.Ready, 'probe', () => Promise.resolve());

        expect(host[HostStartup].removeTask(StartupPhase.Ready, 'probe')).toBe(true);
    });
});
