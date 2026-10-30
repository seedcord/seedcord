import { join } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { importSpecifier, workerdPath } from '#src/files/paths';

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
