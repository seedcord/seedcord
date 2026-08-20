import { describe, expect, it } from 'vitest';

import { isActiveHref, matchActiveHref } from '#src/lib/activeHref';

const TABS = ['/', '/commands', '/gates', '/tooling'];

describe('matchActiveHref', () => {
    it('matches a trailing-slash pathname against a href without one', () => {
        expect(matchActiveHref('/tooling/', TABS)).toBe('/tooling');
    });

    it('picks the longest matching prefix', () => {
        expect(matchActiveHref('/commands/options/', TABS)).toBe('/commands');
    });

    it('falls back to the root for a pathname under no other tab', () => {
        expect(matchActiveHref('/', TABS)).toBe('/');
    });

    it('holds a segment boundary', () => {
        expect(matchActiveHref('/commandsfoo/', TABS)).toBe('/');
    });

    it('returns undefined when nothing matches', () => {
        expect(matchActiveHref('/tooling/', ['/commands'])).toBeUndefined();
    });
});

describe('isActiveHref', () => {
    it('ignores a trailing slash on either side', () => {
        expect(isActiveHref('/tooling/', '/tooling')).toBe(true);
        expect(isActiveHref('/tooling', '/tooling/')).toBe(true);
    });

    it('treats the root as its own page', () => {
        expect(isActiveHref('/', '/')).toBe(true);
        expect(isActiveHref('/', '/commands')).toBe(false);
    });

    it('rejects a child page', () => {
        expect(isActiveHref('/commands/options/', '/commands')).toBe(false);
    });
});
