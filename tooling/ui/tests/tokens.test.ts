import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BRAND_COLORS } from '@seedcord/brand';
import { describe, expect, it } from 'vite-plus/test';

const uiTokens = readFileSync(join(import.meta.dirname, '../src/styles/tokens.css'), 'utf8');

describe('BRAND_COLORS mirrors the token file', () => {
    it.each([
        ['--pith', BRAND_COLORS.pith],
        ['--seed-dark', BRAND_COLORS.seedDark],
        ['--flesh', BRAND_COLORS.flesh],
        ['--rind', BRAND_COLORS.rind],
        ['--flesh-deep', BRAND_COLORS.fleshDeep],
        ['--rind-deep', BRAND_COLORS.rindDeep]
    ] as const)('%s matches the shared UI token', (token, hex) => {
        expect(uiTokens).toContain(`${token}: ${hex};`);
    });
});
