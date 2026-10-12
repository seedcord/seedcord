import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { StateFolder } from '#core/state/StateFolder';

import type { StateFile } from '#core/state/StateFolder';

async function projectDir(): Promise<string> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-state-'));
    onTestFinished(() => tmp.remove());
    return tmp.path;
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
        const state = new StateFolder(await projectDir());

        state.write(counter, { count: 3 });

        expect(state.read(counter)).toEqual({ count: 3 });
    });

    it('reads the defaults before anything was written', async () => {
        const state = new StateFolder(await projectDir());

        expect(state.read(counter)).toEqual({ count: 0 });
    });

    it('reads the defaults from a file that is not json', async () => {
        const dir = await projectDir();
        await mkdir(join(dir, '.seedcord'));
        await writeFile(join(dir, '.seedcord', 'counter.json'), '{ "count": 3');

        expect(new StateFolder(dir).read(counter)).toEqual({ count: 0 });
    });

    it('reads the defaults from json its file does not accept', async () => {
        const dir = await projectDir();
        await mkdir(join(dir, '.seedcord'));
        await writeFile(join(dir, '.seedcord', 'counter.json'), '{ "count": "3" }');

        expect(new StateFolder(dir).read(counter)).toEqual({ count: 0 });
    });
});
