import { describe, expect, it } from 'vitest';

import { CARD, TWIN } from '#lib/docs/PageAsset';

describe('PageAsset', () => {
    it('puts the extension on the last segment', () => {
        expect(TWIN.assetSegments(['packages', 'core', 'latest'])).toEqual(['packages', 'core', 'latest.md']);
        expect(CARD.assetPath('/packages/core/latest')).toBe('/packages/core/latest.png');
    });

    it('calls the root asset index', () => {
        expect(CARD.assetPath('/')).toBe('/index.png');
    });

    it('reads the page back from an asset path', () => {
        expect(CARD.pageSegments(['packages', 'core', 'latest.png'])).toEqual(['packages', 'core', 'latest']);
        expect(CARD.pageSegments(['index.png'])).toEqual([]);
    });

    it('rejects a path without the extension', () => {
        expect(TWIN.pageSegments(['packages', 'core', 'latest'])).toBeUndefined();
        expect(TWIN.pageSegments([])).toBeUndefined();
    });
});
