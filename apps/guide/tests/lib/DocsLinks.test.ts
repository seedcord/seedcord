import { afterEach, describe, expect, it } from 'vitest';

import { DocsLinks } from '#lib/DocsLinks';
import { SymbolRef } from '#lib/SymbolRef';

import { DOCS_INDEX_FIXTURE } from '#tests/test-setup';

describe('DocsLinks', () => {
    afterEach(() => {
        process.env.SEEDCORD_DOCS_INDEX_URL = DOCS_INDEX_FIXTURE;
    });

    it('loads the index again after a load that failed', async () => {
        process.env.SEEDCORD_DOCS_INDEX_URL = `${DOCS_INDEX_FIXTURE}.missing`;
        await expect(DocsLinks.load()).rejects.toThrow();

        process.env.SEEDCORD_DOCS_INDEX_URL = DOCS_INDEX_FIXTURE;
        await expect(DocsLinks.load()).resolves.toBeInstanceOf(DocsLinks);
    });

    it('lists only the packages the index carries', async () => {
        const links = await DocsLinks.load();

        expect(links.hasPackage('core')).toBe(true);
        expect(links.hasPackage('constructor')).toBe(false);
    });

    it('links no page for a package name every object inherits', async () => {
        const links = await DocsLinks.load();
        const ref = SymbolRef.fromUrl('ref:constructor');
        if (!(ref instanceof SymbolRef)) throw new Error(`ref:constructor ${ref}`);

        expect(links.href(ref)).toBeNull();
    });
});
