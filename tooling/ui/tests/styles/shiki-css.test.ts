import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const styles = join(import.meta.dirname, '../../src/styles');
const read = (name: string): string => readFileSync(join(styles, name), 'utf8');

// renderDual in src/shiki.ts emits one block per theme, and these rules hide the wrong one. an app
// consuming the highlighter without them shows both.
describe('the shiki theme toggle ships with the highlighter', () => {
    it('reaches every app through the globals entry', () => {
        expect(read('globals.css')).toContain("@import './shiki.css'");
    });

    it.each([
        ['.shiki-theme-group .shiki-dark', 'the block pair'],
        ['.shiki-inline-group .shiki-dark', 'the inline pair']
    ])('hides %s by default', (selector) => {
        expect(read('shiki.css')).toContain(selector);
    });

    it.each(['.shiki-theme-group .shiki-light', '.shiki-inline-group .shiki-light'])(
        'hides %s under data-theme dark',
        (selector) => {
            expect(read('shiki.css')).toContain(`[data-theme='dark'] ${selector}`);
        }
    );
});
