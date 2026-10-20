import { spawnSync } from 'node:child_process';
import { readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { DevLock } from '#core/state/DevLock';
import { lockDir } from '#tests/lockDir';
import { silentLogger } from '#tests/silentLogger';

const APP = '1195232619718254663';
const BOT_DIR = '/bots/http';

function errorWith(fields: Record<string, unknown>): Error {
    // justified: toThrow takes an Error in its types and a matcher at runtime
    return expect.objectContaining(fields) as Error;
}

function refusedBy(holderDir: string): Error {
    return errorWith({
        code: SeedcordErrorCode.CliDevAlreadyRunning,
        message: expect.stringContaining(holderDir) as string
    });
}

function deadPid(): number {
    const { pid } = spawnSync(process.execPath, ['-e', '']);
    return pid;
}

describe('DevLock', () => {
    it('refuses a second session on an application another live session holds', () => {
        using dir = lockDir();
        new DevLock(dir.path, silentLogger).hold(APP, BOT_DIR);

        expect(() => new DevLock(dir.path, silentLogger).hold(APP, '/bots/other')).toThrow(refusedBy(BOT_DIR));
    });

    it('frees the application once its session releases it, while a refused session leaves nothing behind', () => {
        using dir = lockDir();
        const first = new DevLock(dir.path, silentLogger);
        first.hold(APP, BOT_DIR);
        expect(() => new DevLock(dir.path, silentLogger).hold(APP, '/bots/refused')).toThrow();

        first.release();

        expect(() => new DevLock(dir.path, silentLogger).hold(APP, BOT_DIR)).not.toThrow();
    });

    it('keeps the same lock file when a restart holds the same application again', () => {
        using dir = lockDir();
        const lock = new DevLock(dir.path, silentLogger);
        lock.hold(APP, BOT_DIR);
        const held = readdirSync(dir.path);

        lock.hold(APP, BOT_DIR);

        expect(readdirSync(dir.path)).toEqual(held);
    });

    it('frees the old application when a restart picks up a new token', () => {
        using dir = lockDir();
        const lock = new DevLock(dir.path, silentLogger);
        lock.hold(APP, BOT_DIR);

        lock.hold('1302847100293812224', BOT_DIR);

        expect(() => new DevLock(dir.path, silentLogger).hold(APP, '/bots/other')).not.toThrow();
    });

    it('removes the lock of a session that crashed', () => {
        using dir = lockDir();
        const crashed = { pid: deadPid(), startedAt: Date.now(), configDir: '/bots/crashed' };
        writeFileSync(join(dir.path, `${APP}.crashed.lock`), JSON.stringify(crashed));
        const info = vi.fn();

        new DevLock(dir.path, { ...silentLogger, info }).hold(APP, BOT_DIR);

        expect(info).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(`${APP}.crashed.lock`));
        expect(() => new DevLock(dir.path, silentLogger).hold(APP, '/bots/other')).toThrow(refusedBy(BOT_DIR));
    });

    it.each([
        ['is not json', '{ "pid": 4'],
        ['is json of another shape', JSON.stringify({ pid: process.pid })]
    ])('removes a lock file that %s', (_, contents) => {
        using dir = lockDir();
        writeFileSync(join(dir.path, `${APP}.broken.lock`), contents);

        expect(() => new DevLock(dir.path, silentLogger).hold(APP, BOT_DIR)).not.toThrow();
    });

    // a dangling link throws ENOENT like a lock released after the folder was listed
    it.skipIf(process.platform === 'win32')('skips a lock that is gone by the time it is read', () => {
        using dir = lockDir();
        symlinkSync(join(dir.path, 'released'), join(dir.path, `${APP}.released.lock`));
        const info = vi.fn();

        new DevLock(dir.path, { ...silentLogger, info }).hold(APP, BOT_DIR);

        expect(info).not.toHaveBeenCalled();
    });

    // root owns /, and windows has no uid
    it.skipIf(process.getuid === undefined || process.getuid() === 0)('refuses a lock folder another user owns', () => {
        expect(() => new DevLock('/', silentLogger).hold(APP, BOT_DIR)).toThrow(
            errorWith({ code: SeedcordErrorCode.CliDevLockFolderNotOwned })
        );
    });
});
