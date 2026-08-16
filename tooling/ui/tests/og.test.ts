import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { OG } from '#src/og';

const uiTokens = readFileSync(join(import.meta.dirname, '../src/styles/tokens.css'), 'utf8');

describe('OG palette mirrors the token file', () => {
    it.each([
        ['--pith', OG.pith],
        ['--seed-dark', OG.seedDark],
        ['--flesh', OG.flesh],
        ['--rind', OG.rind],
        ['--flesh-deep', OG.fleshDeep],
        ['--vine-deep', OG.vineDeep]
    ] as const)('%s matches the shared UI token', (token, hex) => {
        expect(uiTokens).toContain(`${token}: ${hex};`);
    });
});
