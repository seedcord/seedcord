import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollMemory } from '#components/useScrollMemory';

function scrollPageTo(top: number): void {
    Object.defineProperty(globalThis, 'scrollY', { value: top, configurable: true });
    fireEvent.scroll(globalThis.window);
}

let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
});

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, 'scrollY');
    sessionStorage.clear();
    history.replaceState(null, '', '/');
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
});
