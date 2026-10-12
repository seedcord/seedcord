import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { StateFolder } from '#core/state/StateFolder';
import { silentLogger } from '#tests/silentLogger';

import type { StateFile } from '#core/state/StateFolder';

async function projectDir(): Promise<string> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-state-'));
    onTestFinished(() => tmp.remove());
    return tmp.path;
}

async function projectWith(contents: string): Promise<string> {
    const dir = await projectDir();
    await mkdir(join(dir, '.seedcord'));
    await writeFile(join(dir, '.seedcord', 'counter.json'), contents);
    return dir;
}

// a folder where the file should be fails both the read and the write
async function projectWithFolderAtFile(): Promise<string> {
    const dir = await projectDir();
    await mkdir(join(dir, '.seedcord', 'counter.json'), { recursive: true });
    return dir;
}

const counter: StateFile<{ count: number }> = {
    name: 'counter.json',
    defaults: { count: 0 },
    parse: (raw) =>
        typeof raw === 'object' && raw !== null && 'count' in raw && typeof raw.count === 'number'
            ? { count: raw.count }
            : undefined,
    serialize: (value) => value
};

describe('StateFolder', () => {
    it('reads back what it wrote', async () => {
        const state = new StateFolder(await projectDir(), silentLogger);

        state.write(counter, { count: 3 });

        expect(state.read(counter)).toEqual({ count: 3 });
    });

    it('reads the defaults before anything was written', async () => {
        const state = new StateFolder(await projectDir(), silentLogger);

        expect(state.read(counter)).toEqual({ count: 0 });
    });

    it('reads the defaults from a file that is not json', async () => {
        const state = new StateFolder(await projectWith('{ "count": 3'), silentLogger);

        expect(state.read(counter)).toEqual({ count: 0 });
    });

    it('reads the defaults from json its file does not accept', async () => {
        const state = new StateFolder(await projectWith('{ "count": "3" }'), silentLogger);

        expect(state.read(counter)).toEqual({ count: 0 });
    });

    it('reads the defaults when the file cannot be read', async () => {
        const state = new StateFolder(await projectWithFolderAtFile(), silentLogger);

        expect(state.read(counter)).toEqual({ count: 0 });
    });

    it('warns on a write it could not save and keeps going', async () => {
        const warn = vi.fn();
        const state = new StateFolder(await projectWithFolderAtFile(), { ...silentLogger, warn });

        state.write(counter, { count: 3 });

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('counter.json'), expect.any(Error));
    });
});
