import { useHotkeys } from '@seedcord/ui';
import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { useGuidePageKeys } from '#components/useGuidePageKeys';

import type { PageKeyTargets } from '#components/useGuidePageKeys';

const TARGETS: PageKeyTargets = {
    tabs: [
        { label: 'Start', href: '/' },
        { label: 'Commands', href: '/commands/slash' },
        { label: 'Tooling', href: '/tooling/cli' }
    ],
    activeHref: '/commands/slash',
    neighbours: {
        previous: { label: 'Core', href: '/core', tab: 'Start' },
        next: { label: 'Options', href: '/commands/options', tab: 'Commands' }
    },
    headingIds: ['setup', 'options']
};

function pressed(targets: PageKeyTargets, keys: { key: string; shiftKey?: boolean }[], inView?: string): string[] {
    const router = { push: vi.fn() };
    const { unmount } = renderHook(() => useHotkeys(useGuidePageKeys(router, targets, inView)));
    for (const key of keys) fireEvent.keyDown(document.body, key);
    unmount();
    return router.push.mock.calls.map(([href]: unknown[]) => String(href));
}

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document.documentElement, 'scrollHeight');
    document.body.innerHTML = '';
});

describe('useGuidePageKeys', () => {
    it('turns pages with the arrows and tabs with Shift and the arrows', () => {
        const hrefs = pressed(TARGETS, [
            { key: 'ArrowLeft' },
            { key: 'ArrowRight' },
            { key: 'ArrowLeft', shiftKey: true },
            { key: 'ArrowRight', shiftKey: true }
        ]);

        expect(hrefs).toEqual(['/core', '/commands/options', '/', '/tooling/cli']);
    });

    it('stays put past the last page and tab, and on a page outside every tab', () => {
        const atEnd = pressed({ ...TARGETS, activeHref: '/tooling/cli', neighbours: {} }, [
            { key: 'ArrowRight' },
            { key: 'ArrowRight', shiftKey: true }
        ]);
        const outside = pressed({ ...TARGETS, activeHref: '' }, [
            { key: 'ArrowLeft', shiftKey: true },
            { key: 'ArrowRight', shiftKey: true }
        ]);

        expect(atEnd).toEqual([]);
        expect(outside).toEqual([]);
    });

    it('scrolls to the bottom with Shift+J and the top with Shift+K', () => {
        Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, configurable: true });
        const scrollTo = vi.fn();
        vi.stubGlobal('scrollTo', scrollTo);

        pressed(TARGETS, [
            { key: 'J', shiftKey: true },
            { key: 'K', shiftKey: true }
        ]);

        expect(scrollTo.mock.calls.map(([options]: { top: number }[]) => options?.top)).toEqual([5000, 0]);
    });

    it('copies the link to the page title at the top and to the section in view further down with y', () => {
        document.body.innerHTML = '<button data-copy-anchor=""></button><button data-copy-anchor="options"></button>';
        const copied: (string | undefined)[] = [];
        for (const button of document.querySelectorAll('button')) {
            button.addEventListener('click', () => copied.push(button.dataset.copyAnchor));
        }

        vi.stubGlobal('scrollY', 0);
        pressed(TARGETS, [{ key: 'y' }], 'options');
        vi.stubGlobal('scrollY', 300);
        pressed(TARGETS, [{ key: 'y' }], 'options');

        expect(copied).toEqual(['', 'options']);
    });
});
