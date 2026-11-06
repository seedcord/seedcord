import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { setDevFiles } from '@seedcord/utils/internal';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { FolderExports } from '#hmr/FolderExports';

import type { Logger } from '@seedcord/logger';

type TestUnit = new () => unknown;

type LoggerSpy = Record<'debug' | 'info' | 'warn' | 'error', ReturnType<typeof vi.fn>>;

function fakeLogger(): { logger: Logger; spies: LoggerSpy } {
    const spies = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const logger = { ...spies, utils: { registration: vi.fn() }, withChannel: (): unknown => logger };
    // justified: FolderExports reads only these levels, utils.registration, and withChannel
    return { logger: logger as unknown as Logger, spies };
}

function debugLines(spies: LoggerSpy): string[] {
    return spies.debug.mock.calls.map(([message]) => String(message));
}

function isUnit(val: unknown): val is TestUnit {
    return typeof val === 'function';
}

describe('FolderExports', () => {
    let dir: string;
    let unitsDir: string;
    let register: ReturnType<typeof vi.fn<(unit: TestUnit, file: string) => void>>;
    let unregister: ReturnType<typeof vi.fn<(unit: TestUnit) => void>>;
    let folder: FolderExports<TestUnit>;
    let spies: LoggerSpy;

    const registered = (): string[] => register.mock.calls.map(([unit]) => unit.name);
    const unregistered = (): string[] => unregister.mock.calls.map(([unit]) => unit.name);

    function write(name: string, source: string): string {
        const file = join(unitsDir, name);
        writeFileSync(file, source);
        return file;
    }

    // load() imports every file once, the way init() does at startup
    async function loaded(files: Record<string, string>): Promise<Record<string, string>> {
        const paths = Object.fromEntries(Object.entries(files).map(([name, source]) => [name, write(name, source)]));
        await folder.load();
        register.mockClear();
        return paths;
    }

    beforeEach(() => {
        // macOS tmpdir is a symlink into /private, and vitest imports a barrel's re-export as a second module under the other path
        dir = realpathSync(mkdtempSync(join(tmpdir(), 'folder-exports-')));
        unitsDir = join(dir, 'commands');
        mkdirSync(unitsDir);
        register = vi.fn<(unit: TestUnit, file: string) => void>();
        unregister = vi.fn<(unit: TestUnit) => void>();
        const fake = fakeLogger();
        spies = fake.spies;
        folder = new FolderExports<TestUnit>({ dir: unitsDir, is: isUnit, register, unregister, logger: fake.logger });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(dir, { recursive: true, force: true });
    });

    describe('load', () => {
        it('registers every export that is() accepts, with the file it came from', async () => {
            const file = write('Ping.mjs', 'export class Ping {}\nexport const helper = 1;\n');

            await folder.load();

            expect(register.mock.calls).toEqual([[expect.objectContaining({ name: 'Ping' }), file]]);
        });

        it('registers a value once when a barrel re-exports it', async () => {
            write('Ping.mjs', 'export class Ping {}\n');
            write('index.mjs', "export { Ping } from './Ping.mjs';\n");

            await folder.load();

            expect(registered()).toEqual(['Ping']);
        });
    });

    describe('saves outside the folder', () => {
        it('ignores a sibling directory that shares the folder prefix', async () => {
            const siblingDir = join(dir, 'commands-extra');
            mkdirSync(siblingDir);
            const siblingFile = join(siblingDir, 'util.mjs');
            writeFileSync(siblingFile, 'export class UtilThing {}\n');

            await folder.handle({ file: siblingFile, type: 'update' });

            expect(register).not.toHaveBeenCalled();
        });

        it('ignores a save under an excluded subfolder, like middlewares that another instance loads', async () => {
            const { logger, spies: nestedSpies } = fakeLogger();
            const nested = new FolderExports<TestUnit>({
                dir: unitsDir,
                exclude: [join(unitsDir, 'middlewares')],
                is: isUnit,
                register,
                unregister,
                logger
            });
            mkdirSync(join(unitsDir, 'middlewares'));
            const file = write(join('middlewares', 'Broken.mjs'), "throw new Error('typo');\n");

            await nested.handle({ file, type: 'update' });

            expect(nestedSpies.error).not.toHaveBeenCalled();
        });

        it.each(['.drafts', 'node_modules/pkg'])('ignores a file saved under %s, which startup skips', async (sub) => {
            mkdirSync(join(unitsDir, sub), { recursive: true });
            const file = write(join(sub, 'Ping.mjs'), 'export class Ping {}\n');

            await folder.handle({ file, type: 'update' });

            expect(register).not.toHaveBeenCalled();
        });
    });

    it('warns when a saved file loses its last export, and stays quiet for a file that never had one', async () => {
        const { 'Ping.mjs': file = '' } = await loaded({ 'Ping.mjs': 'export class Ping {}\n' });
        write('Ping.mjs', 'export const notAUnit = 1;\n');

        await folder.handle({ file, type: 'update' });

        expect(register).not.toHaveBeenCalled();
        expect(spies.warn).toHaveBeenCalledOnce();
        expect(spies.warn.mock.calls[0]?.[0]).toContain('Ping');
        expect(spies.warn.mock.calls[0]?.[0]).toContain('Ping.mjs');

        await folder.handle({ file, type: 'update' });
        expect(spies.warn).toHaveBeenCalledOnce();
    });

    it('skips a created directory without logging a failed reload', async () => {
        const newDir = join(unitsDir, 'nested');
        mkdirSync(newDir);

        await folder.handle({ file: newDir, type: 'createDir' });

        expect(spies.error).not.toHaveBeenCalled();
        expect(spies.warn).not.toHaveBeenCalled();
    });

    it('reloads and registers a file inside the folder', async () => {
        const file = write('Ping.mjs', 'export class Ping {}\n');

        await folder.handle({ file, type: 'update' });

        expect(register.mock.calls).toEqual([[expect.objectContaining({ name: 'Ping' }), file]]);
    });

    it('imports the new contents when two saves of one file land in the same millisecond', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(1);
        const file = write('Ping.mjs', 'export class First {}\n');
        await folder.handle({ file, type: 'update' });
        write('Ping.mjs', 'export class Second {}\n');

        await folder.handle({ file, type: 'update' });

        expect(registered()).toEqual(['First', 'Second']);
    });

    it('reloads a file when the folder is relative to root', async () => {
        using _dev = setDevFiles({ root: dir, listed: [], skippedFolders: [] });
        const relative = new FolderExports<TestUnit>({
            dir: './commands',
            is: isUnit,
            register,
            unregister,
            logger: fakeLogger().logger
        });
        const file = write('Ping.mjs', 'export class Ping {}\n');

        await relative.handle({ file, type: 'update' });

        expect(registered()).toEqual(['Ping']);
    });

    describe('log lines', () => {
        it('reports the reload with how long it took', async () => {
            const file = write('Ping.mjs', 'export class Ping {}\n');

            await folder.handle({ file, type: 'update' });

            expect(debugLines(spies).find((line) => line.includes('Reloaded'))).toMatch(/in \d+ms/);
        });

        it('reports a new file as registered', async () => {
            const file = write('Ping.mjs', 'export class Ping {}\n');

            await folder.handle({ file, type: 'create' });

            expect(debugLines(spies).some((line) => line.includes('Registered') && line.includes('Ping'))).toBe(true);
        });

        it('reports a deleted file as unloaded', async () => {
            const { 'Ping.mjs': file = '' } = await loaded({ 'Ping.mjs': 'export class Ping {}\n' });

            await folder.handle({ file, type: 'delete' });

            expect(debugLines(spies).some((line) => line.includes('Unloaded') && line.includes('Ping'))).toBe(true);
        });

        it('reports one line with the file count when a save fans out', async () => {
            const shared = write('shared.mjs', 'export const value = 1;\n');
            const first = write('Ping.mjs', 'export class Ping {}\n');
            const second = write('Pong.mjs', 'export class Pong {}\n');

            await folder.handle({ file: shared, type: 'update', affectedModules: [shared, first, second] });

            const lines = debugLines(spies).filter((line) => line.includes('Reloaded'));
            expect(lines).toHaveLength(1);
            expect(lines[0]).toContain('2 files');
        });

        it('reports a class once when the file exports it under two names', async () => {
            const file = write('Ping.mjs', 'export class Ping {}\nexport { Ping as Pong };\n');

            await folder.handle({ file, type: 'update' });

            expect(debugLines(spies).find((line) => line.includes('Reloaded'))).toMatch(/Reloaded \S*Ping\S* from/);
        });

        it('stays quiet when a new barrel re-exports a class that is already registered', async () => {
            await loaded({ 'Ping.mjs': 'export class Ping {}\n' });
            const barrel = write('index.mjs', "export { Ping } from './Ping.mjs';\n");

            await folder.handle({ file: barrel, type: 'create' });

            expect(debugLines(spies).some((line) => line.includes('Registered'))).toBe(false);
        });

        it('stays quiet when the file registers nothing', async () => {
            const file = write('Empty.mjs', 'export const value = 1;\n');

            await folder.handle({ file, type: 'update' });

            expect(debugLines(spies).some((line) => line.includes('Reloaded'))).toBe(false);
        });
    });

    describe('deletes', () => {
        it.each(['delete', 'deleteDir'] as const)('unregisters a loaded export on %s', async (type) => {
            const { 'Ping.mjs': file = '' } = await loaded({ 'Ping.mjs': 'export class Ping {}\n' });

            await folder.handle({ file, type });

            expect(unregistered()).toEqual(['Ping']);
            expect(register).not.toHaveBeenCalled();
        });

        it('keeps a value registered until the last file that exports it is deleted', async () => {
            const { 'Ping.mjs': file = '', 'index.mjs': barrel = '' } = await loaded({
                'Ping.mjs': 'export class Ping {}\n',
                'index.mjs': "export { Ping } from './Ping.mjs';\n"
            });

            await folder.handle({ file: barrel, type: 'delete' });
            expect(unregister).not.toHaveBeenCalled();

            await folder.handle({ file, type: 'delete' });
            expect(unregistered()).toEqual(['Ping']);
        });

        it('unregisters a value when its own file is deleted while a barrel still re-exports it', async () => {
            const { 'Ping.mjs': file = '', 'index.mjs': barrel = '' } = await loaded({
                'Ping.mjs': 'export class Ping {}\n',
                'index.mjs': "export { Ping } from './Ping.mjs';\n"
            });
            rmSync(file);

            await folder.handle({ file, type: 'delete', affectedModules: [file, barrel] });

            expect(unregistered()).toEqual(['Ping']);
            expect(register).not.toHaveBeenCalled();
        });
    });

    describe('a register that throws partway through a file', () => {
        beforeEach(() => {
            register.mockImplementation((unit) => {
                if (unit.name === 'Second') throw new Error('Second is taken');
            });
            write('Pair.mjs', 'export class First {}\nexport class Second {}\n');
            write('Other.mjs', 'export class Other {}\n');
        });

        it('unregisters what the file already registered', async () => {
            await folder.handle({ file: join(unitsDir, 'Pair.mjs'), type: 'update' });

            expect(registered()).toEqual(['First', 'Second']);
            expect(unregistered()).toEqual(['First']);
        });

        it('rejects load() and retries the file once a later save unloads something', async () => {
            await expect(folder.load()).rejects.toThrow('Second is taken');
            register.mockReset();

            await folder.handle({ file: join(unitsDir, 'Other.mjs'), type: 'delete' });

            expect(registered()).toEqual(['First', 'Second']);
        });
    });

    describe('a file whose register throws because another file holds its route', () => {
        let owner: TestUnit | undefined;
        let oldFile: string;
        let newFile: string;

        beforeEach(() => {
            owner = undefined;
            // a plain Error, since a plugin's registry throws its own errors
            register.mockImplementation((ctor) => {
                if (owner && owner !== ctor) throw new Error('slash:versions is taken');
                owner = ctor;
            });
            unregister.mockImplementation((ctor) => {
                if (owner === ctor) owner = undefined;
            });
            oldFile = write('Old.mjs', 'export class Old {}\n');
            newFile = write('Versions.mjs', 'export class Versions {}\n');
        });

        async function oldHoldsTheRoute(): Promise<void> {
            await folder.handle({ file: oldFile, type: 'update' });
            await folder.handle({ file: newFile, type: 'create' });
        }

        it('loads once the other file unloads', async () => {
            await oldHoldsTheRoute();
            expect(owner?.name).toBe('Old');

            await folder.handle({ file: oldFile, type: 'delete' });

            expect(owner?.name).toBe('Versions');
        });

        it('stops retrying once a save of the file itself loads it', async () => {
            await oldHoldsTheRoute();
            owner = undefined;
            await folder.handle({ file: newFile, type: 'update' });
            register.mockClear();

            await folder.handle({ file: oldFile, type: 'delete' });

            expect(register).not.toHaveBeenCalled();
        });

        it('loads routes that move between files in one save, whatever order the save lists them', async () => {
            const owners = new Map<string, string>();
            // justified: every class that these fixture files export has a static route
            const routeOf = (ctor: TestUnit): string => (ctor as unknown as { route: string }).route;
            register.mockImplementation((ctor) => {
                if (owners.has(routeOf(ctor))) throw new Error(`${routeOf(ctor)} is taken`);
                owners.set(routeOf(ctor), ctor.name);
            });
            unregister.mockImplementation((ctor) => {
                owners.delete(routeOf(ctor));
            });
            const writeRoute = (name: string, route: string): string =>
                write(`${name}.mjs`, `export class ${name} { static route = '${route}'; }\n`);
            const first = writeRoute('First', 'a');
            const second = writeRoute('Second', 'b');
            const blocked = writeRoute('Blocked', 'b');
            await folder.handle({ file: first, type: 'update' });
            await folder.handle({ file: second, type: 'update' });
            await folder.handle({ file: blocked, type: 'create' });
            writeRoute('First', 'c');
            writeRoute('Second', 'a');

            await folder.handle({ file: first, type: 'update', affectedModules: [blocked, second, first] });

            expect(Object.fromEntries(owners)).toEqual({ a: 'Second', b: 'Blocked', c: 'First' });
        });

        it('blocks a file that fails while another file in the save took its route', async () => {
            await oldHoldsTheRoute();
            write('Old.mjs', "throw new Error('typo');\n");

            await folder.handle({ file: oldFile, type: 'update', affectedModules: [newFile, oldFile] });

            expect(owner?.name).toBe('Versions');
            expect(spies.warn).not.toHaveBeenCalled();

            write('Old.mjs', 'export class Old {}\n');
            await folder.handle({ file: newFile, type: 'delete' });

            expect(owner?.name).toBe('Old');
        });

        it('logs one failure per save while the other file still holds the route', async () => {
            await oldHoldsTheRoute();

            expect(spies.error).toHaveBeenCalledTimes(1);
        });

        it('waits for a save that unloads something before it retries', async () => {
            await oldHoldsTheRoute();
            const other = write('Other.mjs', 'export const value = 1;\n');

            await folder.handle({ file: other, type: 'update' });

            expect(spies.error).toHaveBeenCalledTimes(1);
        });

        it('reloads a blocked file once when a save also lists it as affected', async () => {
            await oldHoldsTheRoute();

            await folder.handle({ file: oldFile, type: 'update', affectedModules: [oldFile, newFile] });

            expect(spies.error).toHaveBeenCalledTimes(2);
        });

        it('leaves a file alone when it failed to import', async () => {
            write('Versions.mjs', 'export class Versions {\n');
            await folder.handle({ file: newFile, type: 'create' });
            await folder.handle({ file: oldFile, type: 'update' });

            await folder.handle({ file: oldFile, type: 'delete' });

            expect(spies.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('a file that throws on import', () => {
        it('restores the last-good export', async () => {
            const { 'Broken.mjs': file = '' } = await loaded({ 'Broken.mjs': 'export class Broken {}\n' });
            write('Broken.mjs', "throw new Error('boom');\n");

            await folder.handle({ file, type: 'update' });

            expect(unregistered()).toEqual(['Broken']);
            expect(register.mock.calls).toEqual([[expect.objectContaining({ name: 'Broken' }), file]]);
        });

        it('does not log a rollback for a file that had no working version', async () => {
            const file = write('Fresh.mjs', "throw new Error('boom');\n");

            await folder.handle({ file, type: 'create' });

            expect(spies.warn).not.toHaveBeenCalled();
            expect(register).not.toHaveBeenCalled();
        });

        it('skips the restore when rollback is disabled', async () => {
            const { 'Broken.mjs': file = '' } = await loaded({ 'Broken.mjs': 'export class Broken {}\n' });
            write('Broken.mjs', "throw new Error('boom');\n");

            await folder.handle({ file, type: 'update', rollback: false });

            expect(unregistered()).toEqual(['Broken']);
            expect(register).not.toHaveBeenCalled();
        });

        it('logs CoreVitePluginThrew when a plugin from vitePlugins throws', async () => {
            const utils = import.meta.resolve('@seedcord/utils/internal');
            const thrownBy = { plugin: 'shop-loader', hook: 'load', configFile: join(dir, 'seedcord.config.ts') };
            const file = write(
                'Shop.mjs',
                `import { recordThrownBy } from ${JSON.stringify(utils)};\nthrow recordThrownBy(new Error('bad yaml'), ${JSON.stringify(thrownBy)});\n`
            );

            await folder.handle({ file, type: 'update' });

            expect(spies.error.mock.calls[0]?.[1]).toMatchObject({
                code: SeedcordErrorCode.CoreVitePluginThrew,
                message: expect.stringContaining('shop-loader') as string
            });
        });
    });
});
