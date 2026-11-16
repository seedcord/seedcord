import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { BotLayout } from '#src/files/BotLayout';

describe('matchesFiles', () => {
    // glob syntax in the root's path has to match as plain text
    const root = path.resolve('/home/me/bot [v2] (copy)/src');
    const layout = new BotLayout({ root, listed: [], skippedFolders: [] });

    it.each([
        ['matches a code file directly in the folder', 'locales/pl.ts', true],
        ['skips a declaration file', 'locales/pl.d.ts', false],
        ['skips a file with another extension', 'locales/pl.ftl', false],
        ['skips a file in a subfolder', 'locales/nested/pl.ts', false]
    ])('%s with the globs from moduleGlobsDirectlyIn', (_case, file, matches) => {
        const globs = layout.moduleGlobsDirectlyIn(path.join(root, 'locales'));

        expect(layout.matchesFiles(path.join(root, file), globs)).toBe(matches);
    });

    it('resolves a relative pattern against root, and skips what a `!` pattern matches', () => {
        const patterns = ['migrations/**', '!migrations/*.md'];

        expect(layout.matchesFiles(path.join(root, 'migrations', '001.sql'), patterns)).toBe(true);
        expect(layout.matchesFiles(path.join(root, 'migrations', 'README.md'), patterns)).toBe(false);
    });
});
