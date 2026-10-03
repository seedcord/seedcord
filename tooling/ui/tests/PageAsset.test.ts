import { describe, expect, it } from 'vitest';

import { CARD, PageAsset, TWIN } from '#src/PageAsset';

describe('the file a page asset is written to', () => {
    it('puts the extension on the last segment', () => {
        expect(TWIN.fileSegments(['commands', 'options'])).toEqual(['commands', 'options.md']);
    });

    it('names a tab index after the tab', () => {
        expect(CARD.fileSegments(['commands'])).toEqual(['commands.png']);
    });

    it('names the root page index', () => {
        expect(TWIN.fileSegments([])).toEqual(['index.md']);
    });
});

describe('the page an asset file points back at', () => {
    it.each([[['commands', 'options']], [['commands']], [[]]])('round trips %j', (segments) => {
        expect(CARD.pageSegments(CARD.fileSegments(segments))).toEqual(segments);
    });

    it('reaches no page when the extension is missing', () => {
        expect(TWIN.pageSegments(['commands', 'options'])).toBeUndefined();
    });

    it('reaches no page for an empty path', () => {
        expect(TWIN.pageSegments([])).toBeUndefined();
    });

    it('reaches no page when the extension belongs to the other asset', () => {
        expect(TWIN.pageSegments(['commands', 'options.png'])).toBeUndefined();
    });
});

describe('where the export writes a page asset', () => {
    it.each([
        ['/commands/options/', '/llms/commands/options.md'],
        ['/commands/options.md', '/llms/commands/options.md'],
        ['/commands/', '/llms/commands.md'],
        ['/', '/llms/index.md']
    ])('writes the markdown for %s to %s', (pagePath, file) => {
        expect(TWIN.exportPath(pagePath)).toBe(file);
    });

    it.each([
        ['/commands/options/', '/og/commands/options.png'],
        ['/commands/options.png', '/og/commands/options.png'],
        ['/', '/og/index.png']
    ])('writes the card for %s to %s', (pagePath, file) => {
        expect(CARD.exportPath(pagePath)).toBe(file);
    });
});

describe('the url a page advertises', () => {
    it.each([
        ['/commands/options/', '/commands/options.md'],
        ['/tooling/', '/tooling.md'],
        ['/', '/index.md']
    ])('advertises the markdown for %s as %s', (pagePath, advertised) => {
        expect(TWIN.publicPath(pagePath)).toBe(advertised);
    });

    it('advertises the card at the page url plus .png', () => {
        expect(CARD.publicPath('/commands/options/')).toBe('/commands/options.png');
    });
});

describe('the asset a url asks for', () => {
    it('reads the twin from a markdown url and the card from a png url', () => {
        expect(PageAsset.forPath('/commands/options.md')).toBe(TWIN);
        expect(PageAsset.forPath('/commands/options.png')).toBe(CARD);
    });

    it('finds none for a page url', () => {
        expect(PageAsset.forPath('/commands/options/')).toBeUndefined();
    });
});
