import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { OG } from '@/og';

const uiTokens = readFileSync(join(import.meta.dirname, '../src/styles/tokens.css'), 'utf8');
const homeTokens = readFileSync(join(import.meta.dirname, '../../../apps/home/src/styles/tokens.css'), 'utf8');

describe('OG palette mirrors token files', () => {
    it.each([
        ['--pith', OG.pith],
        ['--seed-dark', OG.seedDark],
        ['--flesh', OG.flesh],
        ['--rind', OG.rind]
    ] as const)('%s matches the shared UI token', (token, hex) => {
        expect(uiTokens).toContain(`${token}: ${hex};`);
    });

    it.each([
        ['--flesh-deep', OG.fleshDeep],
        ['--vine-deep', OG.vineDeep]
    ] as const)('%s matches the home token', (token, hex) => {
        expect(homeTokens).toContain(`${token}: ${hex};`);
    });
});
