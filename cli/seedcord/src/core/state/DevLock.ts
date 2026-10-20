import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPlainObject } from '@seedcord/utils/internal';

import type { ILogger } from '@seedcord/types';

interface LockBody {
    readonly pid: number;
    readonly startedAt: number;
    readonly configDir: string;
}

function errnoOf(error: unknown): unknown {
    return Error.isError(error) && 'code' in error ? error.code : undefined;
}

// false when another session created the file first
function createLock(path: string, body: LockBody): boolean {
    try {
        writeFileSync(path, JSON.stringify(body), { flag: 'wx' });
        return true;
    } catch (error: unknown) {
        if (errnoOf(error) === 'EEXIST') return false;
        throw error;
    }
}

function readLock(path: string): LockBody | undefined {
    try {
        const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
        return isPlainObject(raw) &&
            typeof raw.pid === 'number' &&
            typeof raw.startedAt === 'number' &&
            typeof raw.configDir === 'string'
            ? { pid: raw.pid, startedAt: raw.startedAt, configDir: raw.configDir }
            : undefined;
    } catch {
        return undefined;
    }
}

// signal 0 checks that the pid exists. EPERM means it exists under another user
function isRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error: unknown) {
        return errnoOf(error) === 'EPERM';
    }
}

function alreadyRunning(holder: LockBody, path: string): SeedcordError {
    const startedAt = new Date(holder.startedAt).toLocaleString();
    return new SeedcordError(SeedcordErrorCode.CliDevAlreadyRunning, [holder.configDir, holder.pid, startedAt, path]);
}

export class DevLock {
    private heldPath: string | undefined;

    constructor(
        private readonly dir: string,
        private readonly logger: ILogger
    ) {}

    public hold(appId: string, configDir: string): void {
        const path = join(this.dir, `${appId}.lock`);
        if (path === this.heldPath) return;
        this.release();
        mkdirSync(this.dir, { recursive: true });

        this.claim(path, { pid: process.pid, startedAt: Date.now(), configDir });
        this.heldPath = path;
    }

    private claim(path: string, body: LockBody): void {
        if (createLock(path, body)) return;

        const holder = readLock(path);
        if (holder && isRunning(holder.pid)) throw alreadyRunning(holder, path);

        rmSync(path, { force: true });
        this.logger.info(`Replaced the lock of a dev session that is no longer running at ${paint.path(path)}`);
        this.claim(path, body);
    }

    public release(): void {
        if (this.heldPath === undefined) return;
        rmSync(this.heldPath, { force: true });
        this.heldPath = undefined;
    }
}
