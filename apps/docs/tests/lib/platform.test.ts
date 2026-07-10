import { describe, expect, it } from 'vitest';

import { isMacPlatform } from '@lib/platform';

describe('isMacPlatform', () => {
    it('detects mac from navigator.platform', () => {
        expect(isMacPlatform({ platform: 'MacIntel', userAgent: 'irrelevant' })).toBe(true);
    });

    it('falls back to userAgent when platform is empty', () => {
        expect(isMacPlatform({ platform: '', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })).toBe(
            true
        );
    });

    it('detects touch devices that share the mac shortcut', () => {
        expect(isMacPlatform({ platform: 'iPhone' })).toBe(true);
        expect(isMacPlatform({ platform: 'iPad' })).toBe(true);
        expect(isMacPlatform({ platform: 'iPod' })).toBe(true);
    });

    it('returns false on windows', () => {
        expect(isMacPlatform({ platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })).toBe(
            false
        );
    });

    it('returns false on linux', () => {
        expect(isMacPlatform({ platform: 'Linux x86_64', userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' })).toBe(false);
    });

    it('returns false when neither field is present', () => {
        expect(isMacPlatform({})).toBe(false);
    });
});
