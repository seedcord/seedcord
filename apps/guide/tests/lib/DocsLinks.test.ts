import { afterEach, describe, expect, it } from 'vitest';

import { DocsLinks } from '#lib/DocsLinks';

import { DOCS_INDEX_FIXTURE } from '../test-setup';

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
});
