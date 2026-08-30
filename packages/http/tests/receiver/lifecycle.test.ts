import { ShutdownPhase, StartupPhase } from '@seedcord/core';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it } from 'vitest';

import { createCore } from '#src/dispatch/dispatchInteraction';

import { nullPathConfig, VALID_TOKEN } from '../helpers/fixtures';

// the logger registry reads the environment on first touch to pick its default level
Envapter.useSource(new PortableSource({ DISCORD_PUBLIC_KEY: 'a'.repeat(64), DISCORD_BOT_TOKEN: VALID_TOKEN }));

function lifecycleError(run: () => void): unknown {
    try {
        run();
    } catch (caught) {
        return caught;
    }
    return undefined;
}

describe('lifecycle tasks on a createSeedcord core', () => {
    it('shutdown.addTask throws', () => {
        const core = createCore(nullPathConfig, VALID_TOKEN);

        const error = lifecycleError(() =>
            core.shutdown.addTask(ShutdownPhase.Drain, 'close-pool', () => Promise.resolve())
        );

        expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CoreLifecycleUnavailable)).toBe(true);
    });

    it('startup.addTask throws', () => {
        const core = createCore(nullPathConfig, VALID_TOKEN);

        const error = lifecycleError(() =>
            core.startup.addTask(StartupPhase.Ready, 'warm-cache', () => Promise.resolve())
        );

        expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CoreLifecycleUnavailable)).toBe(true);
    });
});
