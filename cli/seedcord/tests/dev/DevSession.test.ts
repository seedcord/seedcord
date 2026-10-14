import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { HostAugmentTarget, HostShutdown, HostStartup, HostVersion, SeedcordBrand } from '@seedcord/types/internal';
import { assert, describe, expect, it, onTestFinished, vi } from 'vitest';

import { DevSession } from '#commands/dev/DevSession';
import { InstanceLifecycle } from '#commands/dev/runtime/InstanceLifecycle';
import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';
import { silentLogger } from '#tests/silentLogger';
import { DevStore } from '#ui/stores/DevStore';

import { devConfigFor } from './devConfigFor';

import type { DevSessionDeps } from '#commands/dev/DevSession';
import type { DevRuntime, DevRuntimeContext } from '#commands/dev/runtime/DevRuntime';
import type { DevEvent, DevEventHandler } from '#commands/dev/runtime/events';
import type { ResolvedSeedcordConfig } from '#core/config/schema';

function config(): ResolvedSeedcordConfig {
    return {
        root: process.cwd(),
        configFile: `${process.cwd()}/seedcord.config.ts`,
        target: { kind: 'server', entry: `${process.cwd()}/package.json` },
        instance: `${process.cwd()}/package.json`,
        tunnel: { mode: 'quick' },
        typecheck: { enabled: false },
        idleAnimation: true,
        build: { outDir: 'dist' }
    };
}

function runtime(module: unknown, emit?: DevEvent): DevRuntime {
    const lifecycle = new InstanceLifecycle();
    return {
        start: (context: DevRuntimeContext) => {
            if (emit) context.onEvent?.(emit);
            return Promise.resolve();
        },
        loadEntry: () => Promise.resolve({ module }),
        startBot: (instance) => lifecycle.start(instance),
        stopBot: () => lifecycle.stop(),
        importModule: () => Promise.reject(new Error('the fake runtime loads no files')),
        refreshCommands: () => undefined
    };
}

const UNCHANGED = { outputPath: 'seedcord-gen.d.ts', changed: false };

function sessionDeps(store = new DevStore(), onEvent: DevEventHandler = () => undefined): DevSessionDeps {
    return { store, onEvent, codegen: { writeFrom: () => Promise.resolve(UNCHANGED) }, codegenLogger: silentLogger };
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
    it('never starts a bot that was stopped while bot.ts loaded', async () => {
        const start = vi.fn(() => Promise.resolve());
        const bot = {
            [SeedcordBrand]: true,
            [HostVersion]: '1.2.3',
            [HostAugmentTarget]: '@seedcord/gateway',
            start,
            [HostStartup]: { abort: () => undefined },
            [HostShutdown]: { run: () => Promise.resolve() }
        };
        const { promise: entryRequested, resolve: markRequested } = Promise.withResolvers<undefined>();
        const { promise: entryLoaded, resolve: finishLoad } = Promise.withResolvers<{ module: unknown }>();
        const slowEntry: DevRuntime = {
            ...runtime({}),
            loadEntry: () => {
                markRequested(undefined);
                return entryLoaded;
            }
        };
        const session = new DevSession(config(), slowEntry, sessionDeps());

        const starting = session.start();
        await entryRequested;
        await session.stop();
        finishLoad({ module: { default: bot } });
        await starting;

        expect(start).not.toHaveBeenCalled();
    });

    it('forwards a runtime event past the store', async () => {
        const seen: DevEvent[] = [];
        const session = new DevSession(
            config(),
            runtime({}, { type: 'server-listening', port: 4321 }),
            sessionDeps(new DevStore(), (event) => seen.push(event))
        );

        await settle(session, session.start());

        expect(seen).toContainEqual({ type: 'server-listening', port: 4321 });
    });

    it('applies the event to the store too', async () => {
        const store = new DevStore();
        const session = new DevSession(
            config(),
            runtime({}, { type: 'server-listening', port: 4321 }),
            sessionDeps(store)
        );

        await settle(session, session.start());

        expect(store.getState().port).toBe(4321);
    });

    it('rejects a default export that carries no seedcord brand', async () => {
        const session = new DevSession(config(), runtime({ default: { start: vi.fn() } }), sessionDeps());

        const error = await settle(session, session.start());
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliInstanceInvalid)).toBe(true);
    });

    it('accepts a branded instance', async () => {
        const instance = {
            [SeedcordBrand]: true,
            [HostVersion]: '1.2.3',
            [HostAugmentTarget]: '@seedcord/gateway',
            username: 'TestBot',
            start: () => Promise.resolve(),
            [HostStartup]: { abort: () => undefined },
            [HostShutdown]: { run: () => Promise.resolve() }
        };
        const store = new DevStore();
        const session = new DevSession(config(), runtime({ default: instance }), sessionDeps(store));

        const running = session.start();
        await vi.waitFor(() =>
            expect(store.getState().transport).toEqual({
                name: '@seedcord/gateway',
                version: '1.2.3',
                target: 'server'
            })
        );

        await session.stop();
        await running;
    });

    it('skips a queued type write once the session stops', async () => {
        const instance = {
            [SeedcordBrand]: true,
            [HostVersion]: '1.2.3',
            [HostAugmentTarget]: '@seedcord/gateway',
            start: () => Promise.resolve(),
            [HostStartup]: { abort: () => undefined },
            [HostShutdown]: { run: () => Promise.resolve() }
        };
        const { promise: firstWrite, resolve: finishFirstWrite } = Promise.withResolvers<typeof UNCHANGED>();
        const writeFrom = vi.fn().mockReturnValueOnce(firstWrite).mockResolvedValue(UNCHANGED);
        const session = new DevSession(config(), runtime({ default: instance }), {
            ...sessionDeps(),
            codegen: { writeFrom }
        });

        const running = session.start();
        await vi.waitFor(() => expect(writeFrom).toHaveBeenCalledOnce());
        session.refreshCommands(true);
        const stopping = session.stop();
        finishFirstWrite(UNCHANGED);
        await stopping;
        await running;

        expect(writeFrom).toHaveBeenCalledOnce();
    });

    it('puts a non-Error value that start() rejects with into CliStartFailed', async () => {
        const instance = {
            [SeedcordBrand]: true,
            [HostVersion]: '1.2.3',
            [HostAugmentTarget]: '@seedcord/gateway',
            // eslint-disable-next-line prefer-promise-reject-errors, @typescript-eslint/prefer-promise-reject-errors -- the case under test is a non-Error rejection
            start: () => Promise.reject('token was revoked'),
            [HostStartup]: { abort: () => undefined },
            [HostShutdown]: { run: () => Promise.resolve() }
        };
        const session = new DevSession(config(), runtime({ default: instance }), sessionDeps());

        const error = await settle(session, session.start());

        expect(error).toMatchObject({
            code: SeedcordErrorCode.CliStartFailed,
            message: expect.stringContaining('token was revoked') as string
        });
    });
});

describe('DevSession with a broken entry', () => {
    it('puts the entry path once in front of the parse error', async () => {
        const temp = await mkdtempDisposable(join(tmpdir(), 'dev-session-'));
        onTestFinished(() => temp.remove());
        const entry = join(temp.path, 'src', 'index.ts');
        await mkdir(join(temp.path, 'src'));
        await writeFile(join(temp.path, 'package.json'), JSON.stringify({ name: 'dev-fixture', type: 'module' }));
        await writeFile(entry, 'export const = ;\n');
        const brokenConfig = { ...devConfigFor(temp.path, 'index.ts'), typecheck: { enabled: false } } as const;
        const session = new DevSession(brokenConfig, new ServerDevRuntime(), sessionDeps());
        onTestFinished(() => session.stop());

        const error: unknown = await session.start().catch((caught: unknown) => caught);

        assert(isSeedcordError(error));
        // vite's code frame repeats the path after this point
        const [prefix = '', reason] = error.message.split('Transform failed');
        expect(prefix.split(entry)).toHaveLength(2);
        expect(reason).toContain('Unexpected token');
    }, 60_000);
});
