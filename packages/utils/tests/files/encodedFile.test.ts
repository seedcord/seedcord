import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decodeFile, encodeFile } from '#src/files/encodedFile';

describe('encodeFile', () => {
    it.each([
        ['UTF-8 text', Buffer.from('{ "hi": "salut" }\n')],
        ['text that starts with a byte order mark', Buffer.from('﻿en,fr\n')],
        ['random bytes', randomBytes(4096)],
        ['an empty file', Buffer.alloc(0)]
    ])('gives back the same bytes for %s', (_, bytes) => {
        expect(decodeFile(encodeFile(bytes)).equals(bytes)).toBe(true);
    });
});
