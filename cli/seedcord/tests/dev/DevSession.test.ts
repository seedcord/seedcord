import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { toPosixPath } from '@seedcord/utils/internal';
import { assert, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { DevSession } from '#commands/dev/DevSession';
import { ServerDevRuntime } from '#commands/dev/runtime/ServerDevRuntime';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { DevLock } from '#core/state/DevLock';
import { StateFolder } from '#core/state/StateFolder';
import { bindEnv } from '#tests/bindEnv';
import { APP_ID, FAKE_TOKEN } from '#tests/commands/build/smoke';
import { lockDir, type LockDir } from '#tests/lockDir';
import { silentLogger } from '#tests/silentLogger';
import { vitePluginsOf } from '#tests/vitePluginsOf';
import { DevStore } from '#ui/stores/DevStore';

import { devConfigFor } from './devConfigFor';
import { fakeBot, fakeRuntime } from './fakes';

import type { DevSessionDeps } from '#commands/dev/DevSession';
import type { DevRuntime } from '#commands/dev/runtime/DevRuntime';
import type { ResolvedSeedcordConfig } from '#core/config/schema';

function config(): ResolvedSeedcordConfig {
    return {
        root: realPath(process.cwd()),
        configFile: realPath(join(process.cwd(), 'seedcord.config.ts')),
        target: {
            kind: 'server',
            start: realPath(join(process.cwd(), 'package.json')),
            outDir: realPath(join(process.cwd(), 'dist'))
        },
        instance: realPath(join(process.cwd(), 'package.json')),
        tunnel: { mode: 'quick' },
        typecheck: { enabled: false },
        idleAnimation: true,
        build: {},
        files: [],
        viteMode: 'development',
        vitePlugins: vitePluginsOf()
    };
}

// the two arguments a DevSession takes from a loaded config
function withFiles(loaded: ResolvedSeedcordConfig): [ResolvedSeedcordConfig, ProjectFiles] {
    return [loaded, new ProjectFiles(loaded)];
}

const UNCHANGED = { outputPath: 'seedcord-gen.d.ts', changed: false };

function sessionDeps(
    store = new DevStore(),
    onListening: DevSessionDeps['onListening'] = () => undefined
): DevSessionDeps {
    return {
        store,
        onListening,
        codegen: { writeFrom: () => Promise.resolve(UNCHANGED) },
        codegenLogger: silentLogger,
        state: new StateFolder(process.cwd(), silentLogger),
        lock: new DevLock(locks.path, silentLogger)
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

let locks: LockDir;

beforeEach(() => {
    const test = new DisposableStack();
    test.use(bindEnv({ DISCORD_BOT_TOKEN: FAKE_TOKEN }));
    locks = test.use(lockDir());
    return () => test.dispose();
});

describe('DevSession', () => {
    it('refuses to start a bot whose application another dev session runs', async () => {
        const start = vi.fn(() => Promise.resolve());
        new DevLock(locks.path, silentLogger).hold(APP_ID, '/bots/other');
        const session = new DevSession(
            ...withFiles(config()),
            fakeRuntime({ default: fakeBot({ start }) }),
            sessionDeps()
        );

        const error = await settle(session, session.start());

        expect(error).toMatchObject({ code: SeedcordErrorCode.CliDevAlreadyRunning });
        expect(start).not.toHaveBeenCalled();
    });

    it('never starts a bot that was stopped while bot.ts loaded', async () => {
        const start = vi.fn(() => Promise.resolve());
        const bot = fakeBot({ start });
        const { promise: entryRequested, resolve: markRequested } = Promise.withResolvers<undefined>();
        const { promise: entryLoaded, resolve: finishLoad } = Promise.withResolvers<{ module: unknown }>();
        const slowEntry: DevRuntime = {
            ...fakeRuntime({}),
            loadEntry: () => {
                markRequested(undefined);
                return entryLoaded;
            }
        };
        const session = new DevSession(...withFiles(config()), slowEntry, sessionDeps());

        const starting = session.start();
        await entryRequested;
        await session.stop();
        finishLoad({ module: { default: bot } });
        await starting;

        expect(start).not.toHaveBeenCalled();
    });

    it('never starts a bot whose default export settles after the session stopped', async () => {
        const start = vi.fn(() => Promise.resolve());
        const { promise: exported, resolve: settleExport } = Promise.withResolvers<unknown>();
        const session = new DevSession(...withFiles(config()), fakeRuntime({ default: exported }), sessionDeps());

        const starting = session.start();
        // on the fake runtime, start() reaches the export within one macrotask
        await new Promise((resolve) => setTimeout(resolve, 0));
        await session.stop();
        settleExport(fakeBot({ start }));
        await starting;

        expect(start).not.toHaveBeenCalled();
    });

    it('hands the port the bot listens on to the store and to onListening with the bot it loaded', async () => {
        const store = new DevStore();
        const bot = fakeBot();
        const onListening = vi.fn();
        const session = new DevSession(
            ...withFiles(config()),
            fakeRuntime({ default: bot }, { type: 'server-listening', port: 4321 }),
            sessionDeps(store, onListening)
        );

        const running = session.start();
        await vi.waitFor(() => expect(onListening).toHaveBeenCalledExactlyOnceWith(4321, bot));
        expect(store.getState().port).toBe(4321);

        await session.stop();
        await running;
    });

    it('rejects a default export that carries no seedcord brand', async () => {
        const session = new DevSession(
            ...withFiles(config()),
            fakeRuntime({ default: { start: vi.fn() } }),
            sessionDeps()
        );

        const error = await settle(session, session.start());
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.CliInstanceInvalid)).toBe(true);
    });

    it('accepts a branded instance', async () => {
        const store = new DevStore();
        const session = new DevSession(...withFiles(config()), fakeRuntime({ default: fakeBot() }), sessionDeps(store));

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
        const { promise: firstWrite, resolve: finishFirstWrite } = Promise.withResolvers<typeof UNCHANGED>();
        const writeFrom = vi.fn().mockReturnValueOnce(firstWrite).mockResolvedValue(UNCHANGED);
        const session = new DevSession(...withFiles(config()), fakeRuntime({ default: fakeBot() }), {
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

    it('stops the runtime even when the type write never finishes', async () => {
        const writeFrom = vi.fn(() => new Promise<never>(() => undefined));
        const runtimeStop = vi.fn(() => Promise.resolve());
        const runtime: DevRuntime = { ...fakeRuntime({ default: fakeBot() }), stop: runtimeStop };
        const session = new DevSession(...withFiles(config()), runtime, { ...sessionDeps(), codegen: { writeFrom } });
        const running = session.start();
        await vi.waitFor(() => expect(writeFrom).toHaveBeenCalledOnce());
        vi.useFakeTimers();
        onTestFinished(() => {
            vi.useRealTimers();
        });

        const stopping = session.stop();
        await vi.runAllTimersAsync();
        await stopping;
        await running;

        expect(runtimeStop).toHaveBeenCalledOnce();
    });

    it('ends start() even when stopping the runtime throws', async () => {
        const runtime: DevRuntime = {
            ...fakeRuntime({ default: fakeBot() }),
            stop: () => Promise.reject(new Error('shutdown failed'))
        };
        const store = new DevStore();
        const session = new DevSession(...withFiles(config()), runtime, sessionDeps(store));
        const running = session.start();
        await vi.waitFor(() => expect(store.getState().phase).toBe('running'));

        await expect(session.stop()).rejects.toThrow('shutdown failed');
        await expect(running).resolves.toBeUndefined();
    });

    it('puts a non-Error value that start() rejects with into CliStartFailed', async () => {
        const instance = fakeBot({
            // eslint-disable-next-line prefer-promise-reject-errors, @typescript-eslint/prefer-promise-reject-errors -- the case under test is a non-Error rejection
            start: () => Promise.reject('token was revoked')
        });
        const session = new DevSession(...withFiles(config()), fakeRuntime({ default: instance }), sessionDeps());

        const error = await settle(session, session.start());

        expect(error).toMatchObject({
            code: SeedcordErrorCode.CliStartFailed,
            message: expect.stringContaining('token was revoked') as string
        });
    });

    it('keeps the startup failure as the cause of CliStartFailed', async () => {
        const failure = new Error('phase Ready failed');
        const session = new DevSession(
            ...withFiles(config()),
            fakeRuntime({ default: fakeBot({ start: () => Promise.reject(failure) }) }),
            sessionDeps()
        );

        const error = await settle(session, session.start());

        expect(error).toMatchObject({ code: SeedcordErrorCode.CliStartFailed, cause: failure });
    });
});

describe('DevSession on a real runtime', () => {
    async function project(entry: string): Promise<ResolvedSeedcordConfig> {
        const temp = await mkdtempDisposable(join(tmpdir(), 'dev-session-'));
        onTestFinished(() => temp.remove());
        await mkdir(join(temp.path, 'src'));
        await writeFile(join(temp.path, 'package.json'), JSON.stringify({ name: 'dev-fixture', type: 'module' }));
        await writeFile(join(temp.path, 'src', 'index.ts'), entry);
        return devConfigFor(temp.path, 'index.ts');
    }

    it('ends quietly without loading the entry when it stops while the runtime starts', async () => {
        const entry = 'Reflect.set(globalThis, "entryImported", true);\nexport default {};\n';
        const session = new DevSession(...withFiles(await project(entry)), new ServerDevRuntime(), sessionDeps());
        onTestFinished(() => {
            Reflect.deleteProperty(globalThis, 'entryImported');
        });

        const starting = session.start();
        await session.stop();

        await expect(starting).resolves.toBeUndefined();
        expect(Reflect.get(globalThis, 'entryImported')).toBeUndefined();
    }, 60_000);

    it('ends quietly when it stops while the entry loads', async () => {
        // the entry marks that it started loading, then never finishes
        const entry =
            'Reflect.set(globalThis, "entryLoading", true);\nawait new Promise(() => {});\nexport default {};\n';
        const session = new DevSession(...withFiles(await project(entry)), new ServerDevRuntime(), sessionDeps());
        onTestFinished(() => {
            Reflect.deleteProperty(globalThis, 'entryLoading');
        });

        const starting = session.start();
        await vi.waitFor(() => expect(Reflect.get(globalThis, 'entryLoading')).toBe(true), { timeout: 10_000 });
        await session.stop();

        await expect(starting).resolves.toBeUndefined();
    }, 20_000);
});

describe('DevSession with a broken entry', () => {
    it('puts the entry path once in front of the parse error', async () => {
        const temp = await mkdtempDisposable(join(tmpdir(), 'dev-session-'));
        onTestFinished(() => temp.remove());
        const entry = join(realPath(temp.path), 'src', 'index.ts');
        await mkdir(join(temp.path, 'src'));
        await writeFile(join(temp.path, 'package.json'), JSON.stringify({ name: 'dev-fixture', type: 'module' }));
        await writeFile(entry, 'export const = ;\n');
        const brokenConfig = { ...devConfigFor(temp.path, 'index.ts'), typecheck: { enabled: false } } as const;
        const session = new DevSession(...withFiles(brokenConfig), new ServerDevRuntime(), sessionDeps());
        onTestFinished(() => session.stop());

        const error: unknown = await session.start().catch((caught: unknown) => caught);

        assert(isSeedcordError(error));
        // vite's code frame repeats the path after this point
        const [prefix = '', reason] = error.message.split('Transform failed');
        expect(prefix.split(toPosixPath(entry))).toHaveLength(2);
        expect(reason).toContain('Unexpected token');
    }, 60_000);
});
