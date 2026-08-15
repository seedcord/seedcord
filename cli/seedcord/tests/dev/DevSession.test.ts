import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { SeedcordBrand } from '@seedcord/types/internal';
import { describe, expect, it, vi } from 'vitest';

import { DevSession } from '#commands/dev/DevSession';
import { DevStore } from '#ui/stores/DevStore';

import type { DevRuntime, DevRuntimeContext } from '#commands/dev/runtime/DevRuntime';
import type { DevEvent } from '#commands/dev/runtime/events';
import type { ResolvedSeedcordDevConfig } from '#core/config/schema';

function config(): ResolvedSeedcordDevConfig {
    return {
        root: process.cwd(),
        configFile: `${process.cwd()}/seedcord.config.ts`,
        instance: `${process.cwd()}/package.json`,
        entry: `${process.cwd()}/package.json`,
        tunnel: { mode: 'quick' },
        typecheck: { enabled: false },
        idleAnimation: true,
        build: { outDir: 'dist', bootstrap: 'index.mjs' }
    };
}

function runtime(module: unknown, emit?: DevEvent): DevRuntime {
    return {
        start: (context: DevRuntimeContext) => {
            if (emit) context.onEvent?.(emit);
            return Promise.resolve();
        },
        loadEntry: () => Promise.resolve({ module }),
        dispose: () => Promise.resolve()
    };
}

// start() spawns tsc --watch before it reaches the throw, so every case has to stop the session
async function settle(session: DevSession, run: Promise<unknown>): Promise<unknown> {
    const outcome = await run.then(
        () => null,
        (caught: unknown) => caught
    );
    await session.stop();
    return outcome;
}

describe('DevSession', () => {
    it('forwards a runtime event past the store', async () => {
        const seen: DevEvent[] = [];
        const session = new DevSession(
            config(),
            runtime({}, { type: 'server-listening', port: 4321 }),
            new DevStore(),
            (event) => seen.push(event)
        );

        await settle(session, session.start());

        expect(seen).toContainEqual({ type: 'server-listening', port: 4321 });
    });

    it('applies the event to the store too', async () => {
        const store = new DevStore();
        const session = new DevSession(
            config(),
            runtime({}, { type: 'server-listening', port: 4321 }),
            store,
            () => undefined
        );

        await settle(session, session.start());

        expect(store.getState().port).toBe(4321);
    });

    it('rejects a default export that carries no seedcord brand', async () => {
        const session = new DevSession(
            config(),
            runtime({ default: { start: vi.fn() } }),
            new DevStore(),
            () => undefined
        );

        const error = await settle(session, session.start());
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliInstanceInvalid)).toBe(true);
    });

    it('accepts a branded instance', async () => {
        const instance = {
            [SeedcordBrand]: true,
            version: '1.2.3',
            username: 'TestBot',
            start: () => Promise.resolve(),
            startup: { abort: () => undefined },
            shutdown: { run: () => Promise.resolve() }
        };
        const store = new DevStore();
        const session = new DevSession(config(), runtime({ default: instance }), store, () => undefined);

        const running = session.start();
        await vi.waitFor(() => expect(store.getState().frameworkVersion).toBe('1.2.3'));

        await session.stop();
        await running;
    });
});
