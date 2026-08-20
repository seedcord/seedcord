import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsMac } from '#src/lib/useIsMac';

function withNavigator(nav: { platform?: string; userAgent?: string }): boolean {
    vi.stubGlobal('navigator', nav);
    return renderHook(() => useIsMac()).result.current;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useIsMac', () => {
    it('reads mac from navigator.platform', () => {
        expect(withNavigator({ platform: 'MacIntel', userAgent: 'irrelevant' })).toBe(true);
    });

    it('falls back to userAgent when platform is empty', () => {
        expect(withNavigator({ platform: '', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })).toBe(
            true
        );
    });

    it('treats the touch devices that share the mac shortcut as mac', () => {
        expect(withNavigator({ platform: 'iPhone' })).toBe(true);
        expect(withNavigator({ platform: 'iPad' })).toBe(true);
        expect(withNavigator({ platform: 'iPod' })).toBe(true);
    });

    it('returns false on windows', () => {
        expect(withNavigator({ platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })).toBe(
            false
        );
    });

    it('returns false on linux', () => {
        expect(withNavigator({ platform: 'Linux x86_64', userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' })).toBe(false);
    });

    it('returns false when neither field is present', () => {
        expect(withNavigator({})).toBe(false);
    });
});
