import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { StateFolder } from '#core/state/StateFolder';
import { devPrefsFile } from '#ui/devPrefs';

import type { LogLevel } from '@seedcord/types';

async function projectDir(): Promise<string> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-prefs-'));
    onTestFinished(() => tmp.remove());
    return tmp.path;
}

describe('devPrefsFile', () => {
    it('reads back the filters it wrote', async () => {
        const state = new StateFolder(await projectDir());

        state.write(devPrefsFile, { channels: new Set(['hmr', 'db']), levels: new Set<LogLevel>(['error', 'warn']) });

        expect(state.read(devPrefsFile)).toEqual({
            channels: new Set(['hmr', 'db']),
            levels: new Set(['error', 'warn'])
        });
    });

    it('reads the defaults when a level is not one the filters offer', async () => {
        const dir = await projectDir();
        await mkdir(join(dir, '.seedcord'));
        await writeFile(join(dir, '.seedcord', devPrefsFile.name), '{ "channels": [], "levels": ["verbose"] }');

        expect(new StateFolder(dir).read(devPrefsFile)).toBe(devPrefsFile.defaults);
    });
});
