import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { setDevFiles } from '@seedcord/utils/internal';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { HmrModuleHandler } from '#hmr/HmrModuleHandler';

import type { Logger } from '@seedcord/logger';

type TestHandler = new () => unknown;

type LoggerSpy = Record<'debug' | 'info' | 'warn' | 'error', ReturnType<typeof vi.fn>>;

function fakeLogger(): { logger: Logger; spies: LoggerSpy } {
    const spies = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const logger = { ...spies, withChannel: (): unknown => logger };
    // justified: the handler reads only these levels and withChannel
    return { logger: logger as unknown as Logger, spies };
}

function debugLines(spies: LoggerSpy): string[] {
    return spies.debug.mock.calls.map(([message]) => String(message));
}

function isHandler(val: unknown): val is TestHandler {
    return typeof val === 'function';
}

class FixtureHandler {
    public readonly kind = 'fixture';
}

describe('HmrModuleHandler', () => {
    let dir: string;
    let handlersDir: string;
    let registerHandler: ReturnType<typeof vi.fn<(handler: TestHandler, file: string) => void>>;
    let unregisterHandler: ReturnType<typeof vi.fn<(handler: TestHandler, artifacts?: unknown) => void>>;
    let handler: HmrModuleHandler<TestHandler>;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'hmr-handler-'));
        handlersDir = join(dir, 'commands');
        mkdirSync(handlersDir);
        registerHandler = vi.fn<(handler: TestHandler, file: string) => void>();
        unregisterHandler = vi.fn<(handler: TestHandler, artifacts?: unknown) => void>();
        handler = new HmrModuleHandler<TestHandler>({
            handlers: { dir: handlersDir, is: isHandler, register: registerHandler, unregister: unregisterHandler },
            logger: fakeLogger().logger
        });
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    function handlerWithSpies(): { withSpies: HmrModuleHandler<TestHandler>; spies: LoggerSpy } {
        const { logger, spies } = fakeLogger();
        const withSpies = new HmrModuleHandler<TestHandler>({
            handlers: { dir: handlersDir, is: isHandler, register: registerHandler, unregister: unregisterHandler },
            logger
        });
        return { withSpies, spies };
    }

    it('ignores a sibling directory that shares the handlers-dir prefix', async () => {
        const siblingDir = join(dir, 'commands-extra');
        mkdirSync(siblingDir);
        const siblingFile = join(siblingDir, 'util.mjs');
        writeFileSync(siblingFile, 'export class UtilThing {}\n');

        await handler.handle({ file: siblingFile, type: 'update' });

        expect(registerHandler).not.toHaveBeenCalled();
    });

    it('ignores a sibling directory that shares the middlewares-dir prefix', async () => {
        const middlewaresDir = join(dir, 'middlewares');
        mkdirSync(middlewaresDir);
        const siblingDir = join(dir, 'middlewares-extra');
        mkdirSync(siblingDir);
        const siblingFile = join(siblingDir, 'util.mjs');
        writeFileSync(siblingFile, 'export class UtilThing {}\n');
        const registerMiddleware = vi.fn<(middleware: TestHandler, file: string) => void>();
        const withMiddlewares = new HmrModuleHandler<TestHandler, TestHandler>({
            handlers: {
                dir: handlersDir,
                is: (_val): _val is TestHandler => false,
                register: registerHandler,
                unregister: unregisterHandler
            },
            middlewares: { dir: middlewaresDir, is: isHandler, register: registerMiddleware, unregister: vi.fn() },
            logger: fakeLogger().logger
        });

        await withMiddlewares.handle({ file: siblingFile, type: 'update' });

        expect(registerMiddleware).not.toHaveBeenCalled();
    });

    it.each(['.drafts', 'node_modules/pkg'])(
        'ignores a handler saved under %s, which startup skips',
        async (folder) => {
            const file = join(handlersDir, folder, 'Ping.mjs');
            mkdirSync(join(handlersDir, folder), { recursive: true });
            writeFileSync(file, 'export class Ping {}\n');

            await handler.handle({ file, type: 'update' });

            expect(registerHandler).not.toHaveBeenCalled();
        }
    );

    it('warns when a saved file loses its last handler, and stays quiet for a file that never had one', async () => {
        const { withSpies, spies } = handlerWithSpies();
        const file = join(handlersDir, 'Ping.mjs');
        withSpies.trackHandler(file, FixtureHandler);
        writeFileSync(file, 'export const notAHandler = 1;\n');

        await withSpies.handle({ file, type: 'update' });

        expect(registerHandler).not.toHaveBeenCalled();
        expect(spies.warn).toHaveBeenCalledOnce();
        expect(spies.warn.mock.calls[0]?.[0]).toContain('FixtureHandler');
        expect(spies.warn.mock.calls[0]?.[0]).toContain('Ping.mjs');

        await withSpies.handle({ file, type: 'update' });
        expect(spies.warn).toHaveBeenCalledOnce();
    });

    it('skips a created directory without logging a failed reload', async () => {
        const { withSpies, spies } = handlerWithSpies();
        const newDir = join(handlersDir, 'nested');
        mkdirSync(newDir);

        await withSpies.handle({ file: newDir, type: 'createDir' });

        expect(spies.error).not.toHaveBeenCalled();
        expect(spies.warn).not.toHaveBeenCalled();
    });

    it('reloads and registers a handler file inside the handlers dir', async () => {
        const file = join(handlersDir, 'Ping.mjs');
        writeFileSync(file, 'export class Ping {}\n');

        await handler.handle({ file, type: 'update' });

        expect(registerHandler).toHaveBeenCalledTimes(1);
        expect(registerHandler.mock.calls[0]?.[1]).toBe(file);
    });

    it('reloads a handler file when the handlers dir is relative to root', async () => {
        using _dev = setDevFiles({
            root: dir,
            listed: [],
            skippedFolders: []
        });
        const relative = new HmrModuleHandler<TestHandler>({
            handlers: { dir: './commands', is: isHandler, register: registerHandler, unregister: unregisterHandler },
            logger: fakeLogger().logger
        });
        const file = join(handlersDir, 'Ping.mjs');
        writeFileSync(file, 'export class Ping {}\n');

        await relative.handle({ file, type: 'update' });

        expect(registerHandler).toHaveBeenCalledTimes(1);
    });

    describe('log lines', () => {
        it('reports the reload with how long it took', async () => {
            const { withSpies: timed, spies } = handlerWithSpies();
            const file = join(handlersDir, 'Ping.mjs');
            writeFileSync(file, 'export class Ping {}\n');

            await timed.handle({ file, type: 'update' });

            const line = spies.debug.mock.calls.map(([message]) => String(message)).find((m) => m.includes('Reloaded'));
            expect(line).toMatch(/in \d+ms/);
        });

        it('reports a new file as registered', async () => {
            const { withSpies, spies } = handlerWithSpies();
            const file = join(handlersDir, 'Ping.mjs');
            writeFileSync(file, 'export class Ping {}\n');

            await withSpies.handle({ file, type: 'create' });

            expect(debugLines(spies).some((m) => m.includes('Registered') && m.includes('Ping'))).toBe(true);
        });

        it('reports a deleted file as unloaded', async () => {
            const { withSpies, spies } = handlerWithSpies();
            const file = join(handlersDir, 'Ping.mjs');
            withSpies.trackHandler(file, FixtureHandler);

            await withSpies.handle({ file, type: 'delete' });

            expect(debugLines(spies).some((m) => m.includes('Unloaded') && m.includes('FixtureHandler'))).toBe(true);
        });

        it('reports one line with the file count when a save fans out', async () => {
            const { withSpies, spies } = handlerWithSpies();
            const shared = join(handlersDir, 'shared.mjs');
            const first = join(handlersDir, 'Ping.mjs');
            const second = join(handlersDir, 'Pong.mjs');
            writeFileSync(shared, 'export const value = 1;\n');
            writeFileSync(first, 'export class Ping {}\n');
            writeFileSync(second, 'export class Pong {}\n');

            await withSpies.handle({ file: shared, type: 'update', affectedModules: [shared, first, second] });

            const lines = debugLines(spies).filter((m) => m.includes('Reloaded'));
            expect(lines).toHaveLength(1);
            expect(lines[0]).toContain('2 files');
        });

        it('stays quiet when the file registers nothing', async () => {
            const { withSpies: timed, spies } = handlerWithSpies();
            const file = join(handlersDir, 'Empty.mjs');
            writeFileSync(file, 'export const value = 1;\n');

            await timed.handle({ file, type: 'update' });

            expect(spies.debug.mock.calls.some(([message]) => String(message).includes('Reloaded'))).toBe(false);
        });
    });

    it('unloads a tracked handler on delete', async () => {
        const file = join(handlersDir, 'Ping.mjs');
        handler.trackHandler(file, FixtureHandler);

        await handler.handle({ file, type: 'delete' });

        expect(unregisterHandler).toHaveBeenCalledWith(FixtureHandler, undefined);
        expect(registerHandler).not.toHaveBeenCalled();
    });

    it('unloads a tracked handler on deleteDir', async () => {
        const file = join(handlersDir, 'Ping.mjs');
        handler.trackHandler(file, FixtureHandler);

        await handler.handle({ file, type: 'deleteDir' });

        expect(unregisterHandler).toHaveBeenCalledWith(FixtureHandler, undefined);
    });

    describe('a file that fails because another file holds its route', () => {
        let owner: TestHandler | undefined;
        let oldFile: string;
        let newFile: string;

        beforeEach(() => {
            owner = undefined;
            registerHandler.mockImplementation((ctor) => {
                if (owner && owner !== ctor) {
                    throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, ['route', 'slash:versions']);
                }
                owner = ctor;
            });
            unregisterHandler.mockImplementation((ctor) => {
                if (owner === ctor) owner = undefined;
            });
            oldFile = join(handlersDir, 'Old.mjs');
            newFile = join(handlersDir, 'Versions.mjs');
            writeFileSync(oldFile, 'export class Old {}\n');
            writeFileSync(newFile, 'export class Versions {}\n');
        });

        it('loads once the other file unloads', async () => {
            await handler.handle({ file: oldFile, type: 'update' });
            await handler.handle({ file: newFile, type: 'create' });
            expect(owner?.name).toBe('Old');

            await handler.handle({ file: oldFile, type: 'delete' });

            expect(owner?.name).toBe('Versions');
        });

        it('stops retrying once a save of the file itself loads it', async () => {
            await handler.handle({ file: oldFile, type: 'update' });
            await handler.handle({ file: newFile, type: 'create' });
            owner = undefined;
            await handler.handle({ file: newFile, type: 'update' });
            registerHandler.mockClear();

            await handler.handle({ file: oldFile, type: 'delete' });

            expect(registerHandler).not.toHaveBeenCalled();
        });

        it('loads routes that move between files in one save, whatever order the save lists them', async () => {
            const owners = new Map<string, string>();
            // justified: every class that these fixture files export has a static route
            const routeOf = (ctor: TestHandler): string => (ctor as unknown as { route: string }).route;
            registerHandler.mockImplementation((ctor) => {
                if (owners.has(routeOf(ctor))) {
                    throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, ['route', routeOf(ctor)]);
                }
                owners.set(routeOf(ctor), ctor.name);
            });
            unregisterHandler.mockImplementation((ctor) => {
                owners.delete(routeOf(ctor));
            });
            const write = (name: string, route: string): string => {
                const file = join(handlersDir, `${name}.mjs`);
                writeFileSync(file, `export class ${name} { static route = '${route}'; }\n`);
                return file;
            };
            const first = write('First', 'a');
            const second = write('Second', 'b');
            const blocked = write('Blocked', 'b');
            await handler.handle({ file: first, type: 'update' });
            await handler.handle({ file: second, type: 'update' });
            await handler.handle({ file: blocked, type: 'create' });
            write('First', 'c');
            write('Second', 'a');

            await handler.handle({ file: first, type: 'update', affectedModules: [blocked, second, first] });

            expect(Object.fromEntries(owners)).toEqual({ a: 'Second', b: 'Blocked', c: 'First' });
        });

        it('blocks a file that fails while another file in the save took its route', async () => {
            const { withSpies, spies } = handlerWithSpies();
            await withSpies.handle({ file: oldFile, type: 'update' });
            await withSpies.handle({ file: newFile, type: 'create' });
            writeFileSync(oldFile, "throw new Error('typo');\n");

            await withSpies.handle({ file: oldFile, type: 'update', affectedModules: [newFile, oldFile] });

            expect(owner?.name).toBe('Versions');
            expect(spies.warn).not.toHaveBeenCalled();

            writeFileSync(oldFile, 'export class Old {}\n');
            await withSpies.handle({ file: newFile, type: 'delete' });

            expect(owner?.name).toBe('Old');
        });

        it('logs one failure per save while the other file still holds the route', async () => {
            const { withSpies, spies } = handlerWithSpies();
            await withSpies.handle({ file: oldFile, type: 'update' });

            await withSpies.handle({ file: newFile, type: 'create' });

            expect(spies.error).toHaveBeenCalledTimes(1);
        });

        it('waits for a save that unloads something before it retries', async () => {
            const { withSpies, spies } = handlerWithSpies();
            await withSpies.handle({ file: oldFile, type: 'update' });
            await withSpies.handle({ file: newFile, type: 'create' });
            const other = join(handlersDir, 'Other.mjs');
            writeFileSync(other, 'export const value = 1;\n');

            await withSpies.handle({ file: other, type: 'update' });

            expect(spies.error).toHaveBeenCalledTimes(1);
        });

        it('reloads a blocked file once when a save also lists it as affected', async () => {
            const { withSpies, spies } = handlerWithSpies();
            await withSpies.handle({ file: oldFile, type: 'update' });
            await withSpies.handle({ file: newFile, type: 'create' });

            await withSpies.handle({ file: oldFile, type: 'update', affectedModules: [oldFile, newFile] });

            expect(spies.error).toHaveBeenCalledTimes(2);
        });

        it('leaves a file alone when it failed for another reason', async () => {
            const { withSpies, spies } = handlerWithSpies();
            writeFileSync(newFile, 'export class Versions {\n');
            await withSpies.handle({ file: newFile, type: 'create' });
            await withSpies.handle({ file: oldFile, type: 'update' });

            await withSpies.handle({ file: oldFile, type: 'delete' });

            expect(spies.error).toHaveBeenCalledTimes(1);
        });
    });

    it('restores the last-good handler when a reload fails', async () => {
        const file = join(handlersDir, 'Broken.mjs');
        handler.trackHandler(file, FixtureHandler);
        writeFileSync(file, "throw new Error('boom');\n");

        await handler.handle({ file, type: 'update' });

        expect(unregisterHandler).toHaveBeenCalledWith(FixtureHandler, undefined);
        expect(registerHandler).toHaveBeenCalledWith(FixtureHandler, file);
    });

    it('does not log a rollback for a file that had no working version', async () => {
        const { withSpies, spies } = handlerWithSpies();
        const file = join(handlersDir, 'Fresh.mjs');
        writeFileSync(file, "throw new Error('boom');\n");

        await withSpies.handle({ file, type: 'create' });

        expect(spies.warn).not.toHaveBeenCalled();
        expect(registerHandler).not.toHaveBeenCalled();
    });

    it('skips the restore when rollback is disabled', async () => {
        const file = join(handlersDir, 'Broken.mjs');
        handler.trackHandler(file, FixtureHandler);
        writeFileSync(file, "throw new Error('boom');\n");

        await handler.handle({ file, type: 'update', rollback: false });

        expect(unregisterHandler).toHaveBeenCalledWith(FixtureHandler, undefined);
        expect(registerHandler).not.toHaveBeenCalled();
    });

    it('logs CoreVitePluginThrew when a plugin from vitePlugins throws during a reload', async () => {
        const { withSpies, spies } = handlerWithSpies();
        const file = join(handlersDir, 'Shop.mjs');
        const utils = import.meta.resolve('@seedcord/utils/internal');
        const thrownBy = { plugin: 'shop-loader', hook: 'load', configFile: join(dir, 'seedcord.config.ts') };
        writeFileSync(
            file,
            `import { recordThrownBy } from ${JSON.stringify(utils)};\nthrow recordThrownBy(new Error('bad yaml'), ${JSON.stringify(thrownBy)});\n`
        );

        await withSpies.handle({ file, type: 'update' });

        expect(spies.error.mock.calls[0]?.[1]).toMatchObject({
            code: SeedcordErrorCode.CoreVitePluginThrew,
            message: expect.stringContaining('shop-loader') as string
        });
    });
});
