import { join } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { importSpecifier, matchesFileGlobs, workerdPath } from '#src/files/paths';

describe('matchesFileGlobs', () => {
    const patterns = ['/bot/src/locales/*.ts', '!/bot/src/locales/*.d.ts'];

    it.each([
        ['matches a file directly in the folder', '/bot/src/locales/pl.ts', true],
        ['skips a file that a `!` pattern matches', '/bot/src/locales/pl.d.ts', false],
        ['skips a file in a subfolder', '/bot/src/locales/nested/pl.ts', false],
        ['skips a file with another extension', '/bot/src/locales/pl.ftl', false]
    ])('%s', (_case, file, matches) => {
        expect(matchesFileGlobs(file, patterns)).toBe(matches);
    });

    it('resolves each pattern before it matches', () => {
        const resolve = (pattern: string): string => `/bot/src/${pattern}`;

        expect(matchesFileGlobs('/bot/src/locales/pl.d.ts', ['locales/*.ts', '!locales/*.d.ts'], resolve)).toBe(false);
        expect(matchesFileGlobs('/bot/src/locales/pl.ts', ['locales/*.ts', '!locales/*.d.ts'], resolve)).toBe(true);
    });
});

describe('workerdPath', () => {
    it('makes a Windows path absolute for POSIX path functions', () => {
        expect(workerdPath(String.raw`D:\bot\src\handlers`)).toBe('/D:/bot/src/handlers');
    });

    it('leaves a POSIX path as it is', () => {
        expect(workerdPath('/home/bot/src')).toBe('/home/bot/src');
    });
});

describe('importSpecifier', () => {
    const src = join('/bot', 'src');

    it.each([
        ['a file in the same folder', src, 'bot.ts', './bot'],
        ['a file below the folder', src, 'components/tickets/Appeal.tsx', './components/tickets/Appeal'],
        [
            'a file in a sibling folder',
            join(src, 'handlers/tickets'),
            'components/Appeal.mts',
            '../../components/Appeal'
        ],
        ['a built file', src, 'index.mjs', './index']
    ])('imports %s without its extension', (_case, fromDir, file, specifier) => {
        expect(importSpecifier(fromDir, join(src, file))).toBe(specifier);
    });
});
