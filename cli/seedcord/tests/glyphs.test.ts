import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = resolve(import.meta.dirname, '../src');

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

const ALLOWED = new Set(['✔']);

function offenders(): string[] {
    const found: string[] = [];

    for (const entry of readdirSync(SRC, { recursive: true, encoding: 'utf8' })) {
        if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) continue;

        for (const [index, line] of readFileSync(join(SRC, entry), 'utf8').split('\n').entries()) {
            for (const char of line) {
                if (!PICTOGRAPHIC.test(char) || ALLOWED.has(char)) continue;

                const code = (char.codePointAt(0) ?? 0).toString(16).toUpperCase();
                found.push(`${entry}:${String(index + 1)} ${char} U+${code}`);
            }
        }
    }

    return found;
}

describe('terminal glyphs', () => {
    it('uses no codepoint a terminal draws from its emoji font', () => {
        expect(offenders()).toEqual([]);
    });
});
