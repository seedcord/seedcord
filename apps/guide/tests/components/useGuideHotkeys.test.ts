import { describe, expect, it, vi } from 'vitest';

import { guideHotkeys } from '#components/useGuideHotkeys';

import type { GuideHotkeyActions, GuidePlace } from '#components/useGuideHotkeys';

function actions(): GuideHotkeyActions {
    return {
        toggleSearch: vi.fn(),
        openSearch: vi.fn(),
        toggleSites: vi.fn(),
        showHotkeys: vi.fn(),
        go: vi.fn(),
        stepSection: vi.fn(),
        copySection: vi.fn()
    };
}

const PLACE: GuidePlace = {
    tabs: [
        { label: 'Start', href: '/' },
        { label: 'Commands', href: '/commands/slash' },
        { label: 'Tooling', href: '/tooling/cli' }
    ],
    activeHref: '/commands/slash',
    neighbours: {
        previous: { label: 'Core', href: '/core', tab: 'Start' },
        next: { label: 'Options', href: '/commands/options', tab: 'Commands' }
    }
};

function press(acting: GuideHotkeyActions, place: GuidePlace, key: string, shift = false): void {
    const row = guideHotkeys(acting, place).find(
        (hotkey) => hotkey.key === key && hotkey.mod !== true && (hotkey.shift === true) === shift
    );
    row?.run();
}

describe('guideHotkeys', () => {
    it('turns pages with the arrows and tabs with Shift and the arrows', () => {
        const acting = actions();

        press(acting, PLACE, 'ArrowLeft');
        press(acting, PLACE, 'ArrowRight');
        press(acting, PLACE, 'ArrowLeft', true);
        press(acting, PLACE, 'ArrowRight', true);

        expect(vi.mocked(acting.go).mock.calls).toEqual([['/core'], ['/commands/options'], ['/'], ['/tooling/cli']]);
    });

    it('stays put past the first and last page and tab', () => {
        const acting = actions();
        const edge: GuidePlace = { ...PLACE, activeHref: '/tooling/cli', neighbours: {} };

        press(acting, edge, 'ArrowRight');
        press(acting, edge, 'ArrowRight', true);

        expect(acting.go).not.toHaveBeenCalled();
    });

    it('steps through sections with j and k and copies the section link with y', () => {
        const acting = actions();

        press(acting, PLACE, 'j');
        press(acting, PLACE, 'k');
        press(acting, PLACE, 'y');

        expect(vi.mocked(acting.stepSection).mock.calls).toEqual([[1], [-1]]);
        expect(acting.copySection).toHaveBeenCalledOnce();
    });
});
