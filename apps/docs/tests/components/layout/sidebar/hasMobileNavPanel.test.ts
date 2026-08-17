import { describe, expect, it } from 'vitest';

import { hasMobileNavPanel } from '#components/layout/sidebar/utils/hasMobileNavPanel';

describe('hasMobileNavPanel', () => {
    it('is true on a package version page', () => {
        expect(hasMobileNavPanel('/packages/seedcord/0.12.0')).toBe(true);
    });

    it('is true deeper inside a package version', () => {
        expect(hasMobileNavPanel('/packages/seedcord/0.12.0/classes/Seedcord')).toBe(true);
    });

    it('is false on the landing page', () => {
        expect(hasMobileNavPanel('/')).toBe(false);
    });

    it('is false on routes that mount no sidebar', () => {
        expect(hasMobileNavPanel('/search')).toBe(false);
        expect(hasMobileNavPanel('/entity')).toBe(false);
    });

    it('is false on a package with no version segment', () => {
        expect(hasMobileNavPanel('/packages/seedcord')).toBe(false);
    });
});
