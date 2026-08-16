import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { easeDrawer, easeInOutStrong, easeOutStrong } from '#src/lib/motion';

// the JS easing arrays mirror the --ease-* cubic-beziers in tokens.css, this catches a drift in either
const tokens = readFileSync(join(import.meta.dirname, '../../src/styles/tokens.css'), 'utf8');

function bezier(coeffs: readonly number[]): string {
    return `cubic-bezier(${coeffs.join(', ')})`;
}

describe('motion easings mirror tokens.css', () => {
    it.each([
        ['--ease-out-strong', easeOutStrong],
        ['--ease-in-out-strong', easeInOutStrong],
        ['--ease-drawer', easeDrawer]
    ] as const)('%s matches its CSS cubic-bezier', (_token, coeffs) => {
        expect(tokens).toContain(bezier(coeffs));
    });
});
