import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RENAMED_PAGES, redirectFor } from '#lib/redirects';

const DOCS = resolve(import.meta.dirname, '../../content/docs');

function pageExists(route: string): boolean {
    const slug = route.replace(/^\//, '');
    return [`${slug}.mdx`, `${slug}/index.mdx`].some((file) => existsSync(resolve(DOCS, file)));
}

describe('the rename log', () => {
    it.each(Object.entries(RENAMED_PAGES))('sends %s to a page that exists', (_from, to) => {
        expect(pageExists(to)).toBe(true);
    });

    it.each(Object.keys(RENAMED_PAGES))('keeps %s off a live page', (from) => {
        expect(pageExists(from)).toBe(false);
    });

    it('answers a request that carries the trailing slash', () => {
        expect(redirectFor('/throwing/faults/')).toBe('/replying/faults/');
    });

    it('answers a request without one', () => {
        expect(redirectFor('/throwing/faults')).toBe('/replying/faults/');
    });

    it("leaves a path that wasn't renamed alone", () => {
        expect(redirectFor('/commands/options/')).toBeUndefined();
    });

    it('sends a renamed page markdown twin to the new twin', () => {
        expect(redirectFor('/gates/permissions.md')).toBe('/checks/permissions.md');
    });

    it('sends a renamed page card to the new card', () => {
        expect(redirectFor('/gates/permissions.png')).toBe('/checks/permissions.png');
    });

    it("leaves an asset for a page that wasn't renamed alone", () => {
        expect(redirectFor('/commands/options.md')).toBeUndefined();
    });
});
