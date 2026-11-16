import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { BotLayout } from '#src/files/BotLayout';
import { matchesFileGlobs } from '#src/files/paths';

describe('moduleGlobsInside', () => {
    const root = path.resolve('/bot/src');
    const globs = new BotLayout({ root, listed: [], skippedFolders: [] }).moduleGlobsInside(path.join(root, 'locales'));

    it.each([
        ['matches a code file directly in the folder', 'locales/pl.ts', true],
        ['skips a declaration file', 'locales/pl.d.ts', false],
        ['skips a file with another extension', 'locales/pl.ftl', false],
        ['skips a file in a subfolder', 'locales/nested/pl.ts', false]
    ])('%s', (_case, file, matches) => {
        expect(matchesFileGlobs(path.join(root, file), globs)).toBe(matches);
    });
});
