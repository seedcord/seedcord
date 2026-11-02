import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollMemory } from '#components/useScrollMemory';

function scrollPageTo(top: number): void {
    vi.stubGlobal('scrollY', top);
    fireEvent.scroll(globalThis.window);
}

let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
    // another file in this worker can leave a #hash in the url
    history.replaceState(null, '', '/');
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
});

afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
});

describe('useScrollMemory', () => {
    it('puts a page back where you left it, and opens a new page where the browser put it', () => {
        const { rerender } = renderHook(({ path }) => useScrollMemory(path), { initialProps: { path: '/core/' } });
        scrollPageTo(1200);

        rerender({ path: '/commands/' });
        expect(scrollTo).not.toHaveBeenCalled();

        rerender({ path: '/core/' });
        expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'instant' });
    });

    it('leaves a link to a section on that section', () => {
        const { rerender } = renderHook(({ path }) => useScrollMemory(path), { initialProps: { path: '/core/' } });
        scrollPageTo(1200);
        rerender({ path: '/commands/' });

        history.replaceState(null, '', '/core/#plugins');
        rerender({ path: '/core/' });

        expect(scrollTo).not.toHaveBeenCalled();
    });

    it('keeps the page working when the browser blocks storage', () => {
        vi.stubGlobal('sessionStorage', undefined);
        Object.defineProperty(globalThis, 'sessionStorage', {
            configurable: true,
            get: () => {
                throw new DOMException('The operation is insecure.', 'SecurityError');
            }
        });

        expect(() => {
            const { rerender } = renderHook(({ path }) => useScrollMemory(path), { initialProps: { path: '/core/' } });
            scrollPageTo(1200);
            rerender({ path: '/commands/' });
        }).not.toThrow();
    });
});
