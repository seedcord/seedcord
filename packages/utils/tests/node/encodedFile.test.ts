import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decodeFile, encodeFile } from '#src/node/directory/encodedFile';

describe('encodeFile', () => {
    it('keeps UTF-8 text as a plain string', () => {
        expect(encodeFile(Buffer.from('# héllo\n'))).toEqual({ encoding: 'utf8', data: '# héllo\n' });
    });

    it('stores bytes that are not UTF-8 as base64', () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff]);

        expect(encodeFile(png)).toEqual({ encoding: 'base64', data: png.toString('base64') });
    });

    it.each([
        ['UTF-8 text', Buffer.from('{ "hi": "salut" }\n')],
        ['text that starts with a byte order mark', Buffer.from('﻿en,fr\n')],
        ['random bytes', randomBytes(4096)],
        ['an empty file', Buffer.alloc(0)]
    ])('gives back the same bytes for %s', (_, bytes) => {
        expect(decodeFile(encodeFile(bytes)).equals(bytes)).toBe(true);
    });
});
