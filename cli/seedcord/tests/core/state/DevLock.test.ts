import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { DevLock } from '#core/state/DevLock';
import { lockDir } from '#tests/lockDir';
import { silentLogger } from '#tests/silentLogger';

const APP = '1195232619718254663';
const BOT_DIR = '/bots/http';

function refusedBy(holderDir: string): Error {
    return expect.objectContaining({
        code: SeedcordErrorCode.CliDevAlreadyRunning,
        message: expect.stringContaining(holderDir) as string
    }) as Error;
}

function deadPid(): number {
    const { pid } = spawnSync(process.execPath, ['-e', '']);
    return pid;
}

describe('DevLock', () => {
    it('refuses a second session on an application another live session holds', () => {
        const dir = lockDir();
        new DevLock(dir, silentLogger).hold(APP, BOT_DIR);

        expect(() => new DevLock(dir, silentLogger).hold(APP, '/bots/other')).toThrow(refusedBy(BOT_DIR));
    });

    it('frees the application once the session releases it', () => {
        const dir = lockDir();
        const first = new DevLock(dir, silentLogger);
        first.hold(APP, BOT_DIR);

        first.release();

        expect(() => new DevLock(dir, silentLogger).hold(APP, BOT_DIR)).not.toThrow();
    });

    it('keeps the lock when a restart holds the same application again', () => {
        const lock = new DevLock(lockDir(), silentLogger);
        lock.hold(APP, BOT_DIR);

        expect(() => lock.hold(APP, BOT_DIR)).not.toThrow();
    });

    it('frees the old application when a restart picks up a new token', () => {
        const dir = lockDir();
        const lock = new DevLock(dir, silentLogger);
        lock.hold(APP, BOT_DIR);

        lock.hold('1302847100293812224', BOT_DIR);

        expect(() => new DevLock(dir, silentLogger).hold(APP, '/bots/other')).not.toThrow();
    });

    it('replaces a lock whose session crashed', () => {
        const dir = lockDir();
        const crashed = { pid: deadPid(), startedAt: Date.now(), configDir: '/bots/crashed' };
        writeFileSync(join(dir, `${APP}.lock`), JSON.stringify(crashed));
        const info = vi.fn();

        new DevLock(dir, { ...silentLogger, info }).hold(APP, BOT_DIR);

        expect(info).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(`${APP}.lock`));
        expect(() => new DevLock(dir, silentLogger).hold(APP, '/bots/other')).toThrow(refusedBy(BOT_DIR));
    });

    it.each([
        ['is not json', '{ "pid": 4'],
        ['is json of another shape', JSON.stringify({ pid: process.pid })]
    ])('replaces a lock file that %s', (_, contents) => {
        const dir = lockDir();
        writeFileSync(join(dir, `${APP}.lock`), contents);

        expect(() => new DevLock(dir, silentLogger).hold(APP, BOT_DIR)).not.toThrow();
    });
});
