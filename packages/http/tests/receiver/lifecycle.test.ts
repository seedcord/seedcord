import { ShutdownPhase, StartupPhase } from '@seedcord/core';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/edge/Seedcord';

// the logger registry reads the environment on first touch to pick its default level
Envapter.useSource(new PortableSource({}));

function edgeSeedcord(): Seedcord {
    return new Seedcord({
        bot: { interactions: { path: null }, commands: { path: null } },
        subscribers: { path: null }
    });
}

function lifecycleError(run: () => void): unknown {
    try {
        run();
    } catch (caught) {
        return caught;
    }
    return undefined;
}

describe('lifecycle tasks on an edge Seedcord', () => {
    afterEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
    });

    it('shutdown.addTask throws', () => {
        const seedcord = edgeSeedcord();

        const error = lifecycleError(() =>
            seedcord.shutdown.addTask(ShutdownPhase.Drain, 'close-pool', () => Promise.resolve())
        );

        expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CoreLifecycleUnavailable)).toBe(true);
    });

    it('startup.addTask throws', () => {
        const seedcord = edgeSeedcord();

        const error = lifecycleError(() =>
            seedcord.startup.addTask(StartupPhase.Ready, 'warm-cache', () => Promise.resolve())
        );

        expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CoreLifecycleUnavailable)).toBe(true);
    });
});
