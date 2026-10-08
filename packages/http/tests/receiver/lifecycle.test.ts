import { ShutdownPhase } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/edge/Seedcord';

// the logger registry reads the environment on first touch to pick its default level
Envapter.useSource(new PortableSource({}));

describe('shutdown tasks on an edge Seedcord', () => {
    afterEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
    });

    it('shutdown.addTask throws', () => {
        const seedcord = new Seedcord({
            bot: { interactions: { path: null }, commands: { path: null } },
            subscribers: { path: null }
        });

        expect(() => seedcord.shutdown.addTask(ShutdownPhase.Drain, 'close-pool', () => Promise.resolve())).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreLifecycleUnavailable })
        );
    });
});
