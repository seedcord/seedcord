import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { stageNotice } from '@seedcord/brand';
import { describe, expect, it } from 'vite-plus/test';

import { Workspace } from '#src/lib/Workspace';

const REPO = path.resolve(import.meta.dirname, '../..');

const AFFECTED = ['your bot', 'your plugin', 'your code', 'your lint setup'];

const workspace = await Workspace.load(REPO);

const belowV1 = workspace.published().filter((one) => one.packageJson.version.startsWith('0.'));

const FILES = [
    'README.md',
    'apps/guide/content/docs/index.mdx',
    ...belowV1.map((one) => path.join(one.relativeDir, 'README.md'))
];

describe('the stage notice', () => {
    it.each(FILES)('%s has the sentence that @seedcord/brand writes', async (file) => {
        const text = await readFile(path.join(REPO, file), 'utf8');

        expect(AFFECTED.some((affected) => text.includes(stageNotice(affected)))).toBe(true);
    });
});
