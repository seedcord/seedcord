import { useHotkeys } from '@seedcord/ui';
import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { useGuidePageKeys } from '#components/useGuidePageKeys.ts';

import type { PageKeyTargets } from '#components/useGuidePageKeys.ts';

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

    it('copies the link to the section in view with y', () => {
        document.body.innerHTML = '<button data-copy-anchor="options"></button>';
        const copy = vi.fn();
        document.querySelector('button')?.addEventListener('click', copy);

        pressed(TARGETS, [{ key: 'y' }], 'options');

        expect(copy).toHaveBeenCalledOnce();
    });
});
