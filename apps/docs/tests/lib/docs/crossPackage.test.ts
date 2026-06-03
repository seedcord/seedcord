import { describe, expect, it } from 'vitest';

import { isExternalHref, opensInNewTab } from '@lib/docs/crossPackage';

describe('isExternalHref', () => {
    it('matches http and https URLs', () => {
        expect(isExternalHref('https://discord.js.org/docs')).toBe(true);
        expect(isExternalHref('http://example.com')).toBe(true);
    });

    it('rejects internal and relative hrefs', () => {
        expect(isExternalHref('/packages/seedcord/latest/classes/Seedcord')).toBe(false);
        expect(isExternalHref('#constructor')).toBe(false);
    });
});

describe('opensInNewTab', () => {
    it('returns false for a same-package internal link', () => {
        expect(opensInNewTab('/packages/seedcord/latest/classes/Seedcord', 'seedcord')).toBe(false);
    });

    it('returns true for a different-package internal link', () => {
        // @seedcord/utils renders under the `utils` display segment.
        expect(opensInNewTab('/packages/utils/latest/functions/clamp', 'seedcord')).toBe(true);
    });

    it('compares against the display segment, not the manifest name', () => {
        expect(opensInNewTab('/packages/utils/latest/functions/clamp', '@seedcord/utils')).toBe(false);
        expect(opensInNewTab('/packages/seedcord/latest/classes/Seedcord', '@seedcord/utils')).toBe(true);
    });

    it('returns true for external https links regardless of current package', () => {
        expect(opensInNewTab('https://discord.js.org/docs', 'seedcord')).toBe(true);
    });

    it('returns false for in-page anchors and non-package paths', () => {
        expect(opensInNewTab('#constructor', 'seedcord')).toBe(false);
        expect(opensInNewTab('/404', 'seedcord')).toBe(false);
    });
});
