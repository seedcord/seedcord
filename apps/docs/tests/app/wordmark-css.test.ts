import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CSS = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function displayForSelector(selector: string): string | undefined {
    const rules = new Map<string, string>();
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(CSS))) {
        const sel = match[1]?.trim();
        if (sel) rules.set(sel, match[2] ?? '');
    }
    return /display:\s*([a-z-]+)/i.exec(rules.get(selector) ?? '')?.[1];
}

describe('wordmark theme imgs (globals.css)', () => {
    it('renders both theme variants with the same display so the logo does not shift on toggle', () => {
        const lightShown = displayForSelector('.readme-img-light');
        const darkShown = displayForSelector("[data-theme='dark'] .readme-img-dark");

        expect(lightShown).toBe('inline');
        expect(darkShown).toBe('inline');
    });
});
