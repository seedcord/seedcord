import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

interface HeldLock {
    readonly appId: string;
    readonly path: string;
}

function errnoOf(error: unknown): unknown {
    return Error.isError(error) && 'code' in error ? error.code : undefined;
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

// windows has no uids and gives every user their own tmpdir
function assertOwnFolder(dir: string): void {
    const uid = process.getuid?.();
    if (uid !== undefined && statSync(dir).uid !== uid) {
        throw new SeedcordError(SeedcordErrorCode.CliDevLockFolderNotOwned, [dir]);
    }
}

export class DevLock {
    private held: HeldLock | undefined;

    constructor(
        private readonly dir: string,
        private readonly logger: ILogger
    ) {}

    // linux shares one /tmp across users
    public static create(logger: ILogger): DevLock {
        const uid = process.getuid?.();
        return new DevLock(join(tmpdir(), uid === undefined ? 'seedcord-dev' : `seedcord-dev-${uid}`), logger);
    }

    public hold(appId: string, configDir: string): void {
        if (this.held?.appId === appId) return;
        this.release();
        mkdirSync(this.dir, { recursive: true, mode: 0o700 });
        assertOwnFolder(this.dir);

        const path = this.publish(appId, { pid: process.pid, startedAt: Date.now(), configDir });
        try {
            this.assertOnlySession(appId, path);
        } catch (error: unknown) {
            rmSync(path, { force: true });
            throw error;
        }
        this.held = { appId, path };
    }

    public release(): void {
        if (!this.held) return;
        rmSync(this.held.path, { force: true });
        this.held = undefined;
    }

    // renaming a finished draft keeps half-written locks out of other sessions' reads
    private publish(appId: string, body: LockBody): string {
        const session = randomUUID();
        const draft = join(this.dir, `${session}.tmp`);
        const path = join(this.dir, `${appId}.${session}.lock`);
        writeFileSync(draft, JSON.stringify(body));
        renameSync(draft, path);
        return path;
    }

    // a session deletes only its own file or one whose pid is dead
    private assertOnlySession(appId: string, ownPath: string): void {
        for (const name of readdirSync(this.dir)) {
            const path = join(this.dir, name);
            if (path === ownPath || !name.startsWith(`${appId}.`) || !name.endsWith('.lock')) continue;

            const holder = readLock(path);
            if (holder && isRunning(holder.pid)) throw alreadyRunning(holder, path);

            rmSync(path, { force: true });
            this.logger.info(`Removed a stale dev session lock at ${paint.path(path)}`);
        }
    }
}
