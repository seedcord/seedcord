import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { HmrModuleHandler } from '@hmr/HmrModuleHandler';

import type { Logger } from '@seedcord/logger';

type TestHandler = new () => unknown;

function fakeLogger(): Logger {
    const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        inChannel: (): unknown => logger
    };
    // justified: the handler reads only info/warn/error/inChannel, a real Logger would print into test output
    return logger as unknown as Logger;
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
            handlersDir,
            isHandler,
            registerHandler,
            unregisterHandler,
            logger: fakeLogger()
        });
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

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
            handlersDir,
            middlewaresDir,
            isHandler: (_val): _val is TestHandler => false,
            isMiddleware: isHandler,
            registerHandler,
            registerMiddleware,
            unregisterHandler,
            logger: fakeLogger()
        });

        await withMiddlewares.handle({ file: siblingFile, type: 'update' });

        expect(registerMiddleware).not.toHaveBeenCalled();
    });

    it('skips a created directory without logging a failed reload', async () => {
        const errorSpy = vi.fn();
        const warnSpy = vi.fn();
        const logger = {
            info: vi.fn(),
            warn: warnSpy,
            error: errorSpy,
            inChannel: (): unknown => logger
        };
        const withSpies = new HmrModuleHandler<TestHandler>({
            handlersDir,
            isHandler,
            registerHandler,
            unregisterHandler,
            // justified: the handler reads only info/warn/error/inChannel, a real Logger would print into test output
            logger: logger as unknown as Logger
        });
        const newDir = join(handlersDir, 'nested');
        mkdirSync(newDir);

        await withSpies.handle({ file: newDir, type: 'createDir' });

        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('reloads and registers a handler file inside the handlers dir', async () => {
        const file = join(handlersDir, 'Ping.mjs');
        writeFileSync(file, 'export class Ping {}\n');

        await handler.handle({ file, type: 'update' });

        expect(registerHandler).toHaveBeenCalledTimes(1);
        expect(registerHandler.mock.calls[0]?.[1]).toBe(file);
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

    it('treats an update for a missing tracked file as a delete', async () => {
        const file = join(handlersDir, 'Gone.mjs');
        handler.trackHandler(file, FixtureHandler);

        await handler.handle({ file, type: 'update' });

        expect(unregisterHandler).toHaveBeenCalledWith(FixtureHandler, undefined);
        expect(registerHandler).not.toHaveBeenCalled();
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
        const warnSpy = vi.fn();
        const logger = {
            info: vi.fn(),
            warn: warnSpy,
            error: vi.fn(),
            inChannel: (): unknown => logger
        };
        const withSpies = new HmrModuleHandler<TestHandler>({
            handlersDir,
            isHandler,
            registerHandler,
            unregisterHandler,
            // justified: the handler reads only info/warn/error/inChannel, a real Logger would print into test output
            logger: logger as unknown as Logger
        });
        const file = join(handlersDir, 'Fresh.mjs');
        writeFileSync(file, "throw new Error('boom');\n");

        await withSpies.handle({ file, type: 'create' });

        expect(warnSpy).not.toHaveBeenCalled();
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
});
