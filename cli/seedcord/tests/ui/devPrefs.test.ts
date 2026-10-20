import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, onTestFinished } from 'vitest';

import { StateFolder } from '#core/state/StateFolder';
import { silentLogger } from '#tests/silentLogger';
import { devPrefsFile } from '#ui/devPrefs';

import type { DevPrefs } from '#ui/devPrefs';
import type { LogLevel } from '@seedcord/types';

async function projectDir(): Promise<string> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-prefs-'));
    onTestFinished(() => tmp.remove());
    return tmp.path;
}

describe('devPrefsFile', () => {
    it('reads back the prefs it wrote', async () => {
        const state = new StateFolder(await projectDir(), silentLogger);
        const prefs: DevPrefs = {
            filters: { channels: new Set(['hmr', 'db']), levels: new Set<LogLevel>(['error', 'warn']) },
            details: 'none',
            railHidden: true
        };

        state.write(devPrefsFile, prefs);

        expect(state.read(devPrefsFile)).toEqual(prefs);
    });

    it('reads the defaults when a level is not one the filters offer', async () => {
        const dir = await projectDir();
        const file = { filters: { channels: ['hmr'], levels: ['verbose'] }, details: 'none', railHidden: false };
        await mkdir(join(dir, '.seedcord'));
        await writeFile(join(dir, '.seedcord', devPrefsFile.name), JSON.stringify(file));

        expect(new StateFolder(dir, silentLogger).read(devPrefsFile)).toEqual(devPrefsFile.defaults);
    });
});
