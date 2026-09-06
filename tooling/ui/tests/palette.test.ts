import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BRAND } from '#src/palette';

const uiTokens = readFileSync(join(import.meta.dirname, '../src/styles/tokens.css'), 'utf8');

describe('BRAND mirrors the token file', () => {
    it.each([
        ['--pith', BRAND.pith],
        ['--seed-dark', BRAND.seedDark],
        ['--flesh', BRAND.flesh],
        ['--rind', BRAND.rind],
        ['--flesh-deep', BRAND.fleshDeep],
        ['--rind-deep', BRAND.rindDeep]
    ] as const)('%s matches the shared UI token', (token, hex) => {
        expect(uiTokens).toContain(`${token}: ${hex};`);
    });
});
