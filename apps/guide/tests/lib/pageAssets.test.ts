import { describe, expect, it } from 'vitest';

import { assetPath, assetSegments, CARD, generatedPathFor, publicPath, slugsFromAsset, TWIN } from '#lib/pageAssets';

describe('the file a page asset is written to', () => {
    it('puts the extension on the last segment', () => {
        expect(assetSegments(['commands', 'options'], TWIN)).toEqual(['commands', 'options.md']);
    });

    it('names a tab index after the tab', () => {
        expect(assetSegments(['commands'], CARD)).toEqual(['commands.png']);
    });

    it('names the root page index', () => {
        expect(assetSegments([], TWIN)).toEqual(['index.md']);
    });
});

describe('the page an asset path points back at', () => {
    it.each([[['commands', 'options']], [['commands']], [[]]])('round trips %j', (slugs) => {
        expect(slugsFromAsset(assetSegments(slugs, CARD), CARD)).toEqual(slugs);
    });

    it('reaches no page when the extension is missing', () => {
        expect(slugsFromAsset(['commands', 'options'], TWIN)).toBeUndefined();
    });

    it('reaches no page for an empty path', () => {
        expect(slugsFromAsset([], TWIN)).toBeUndefined();
    });

    it('reaches no page when the extension belongs to the other asset', () => {
        expect(slugsFromAsset(['commands', 'options.png'], TWIN)).toBeUndefined();
    });
});

describe('where a page url reads its markdown and its card from', () => {
    it.each([
        ['/commands/options/', '/llms/commands/options.md'],
        ['/commands/options.md', '/llms/commands/options.md'],
        ['/commands/', '/llms/commands.md'],
        ['/', '/llms/index.md']
    ])('reads the markdown for %s from %s', (pathname, asset) => {
        expect(assetPath(pathname, TWIN)).toBe(asset);
    });

    it.each([
        ['/commands/options/', '/og/commands/options.png'],
        ['/commands/options.png', '/og/commands/options.png'],
        ['/', '/og/index.png']
    ])('reads the card for %s from %s', (pathname, asset) => {
        expect(assetPath(pathname, CARD)).toBe(asset);
    });
});

describe('the url a page advertises', () => {
    it.each([
        ['/commands/options/', '/commands/options.md'],
        ['/tooling/', '/tooling.md'],
        ['/', '/index.md']
    ])('advertises the markdown for %s as %s', (pathname, advertised) => {
        expect(publicPath(pathname, TWIN)).toBe(advertised);
    });

    it('advertises the card at the page url plus .png', () => {
        expect(publicPath('/commands/options/', CARD)).toBe('/commands/options.png');
    });
});

describe('what the worker serves a bare page url from', () => {
    it('reads a markdown url out of the twin folder', () => {
        expect(generatedPathFor('/commands/options.md')).toBe('/llms/commands/options.md');
    });

    it('reads a png url out of the card folder', () => {
        expect(generatedPathFor('/commands/options.png')).toBe('/og/commands/options.png');
    });

    it('generates nothing for a url naming neither', () => {
        expect(generatedPathFor('/commands/options/')).toBeUndefined();
    });
});
