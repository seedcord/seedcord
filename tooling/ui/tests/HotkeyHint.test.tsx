import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HotkeyHint } from '#src/HotkeyHint';
import { SearchTrigger } from '#src/SearchTrigger';
import { SiteSwitcher } from '#src/SiteSwitcher';
import { TooltipProvider } from '#src/Tooltip';

import type { ReactElement } from 'react';

const TOOLTIP_DELAY_MS = 400;

function withTooltips(ui: ReactElement): ReactElement {
    return <TooltipProvider>{ui}</TooltipProvider>;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('HotkeyHint', () => {
    it('gives the control its shortcut and shows the keys on hover', () => {
        render(
            withTooltips(
                <HotkeyHint hotkey={{ key: 'ArrowRight', shift: true, description: 'Next tab' }}>
                    <a href="/next">Next</a>
                </HotkeyHint>
            )
        );
        const link = screen.getByRole('link', { name: 'Next' });
        expect(link).toHaveAttribute('aria-keyshortcuts', 'Shift+ArrowRight');

        // radix opens a tooltip on pointermove from a mouse
        fireEvent.pointerMove(link, { pointerType: 'mouse' });
        act(() => {
            vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
        });

        expect(screen.getByRole('tooltip')).toHaveTextContent(/Next tab.*Shift.*Right/);
    });

    it('puts the site keys on the controls they open', () => {
        render(
            withTooltips(
                <>
                    <SiteSwitcher site="guide" destinations={[]} open={false} onOpenChange={vi.fn()} returnFocus />
                    <SearchTrigger label="Search the guide" onOpen={vi.fn()} />
                </>
            )
        );

        expect(screen.getByRole('button', { name: 'Switch site' })).toHaveAttribute('aria-keyshortcuts', 'S');
        expect(screen.getByRole('button', { name: 'Search the guide' })).toHaveAttribute(
            'aria-keyshortcuts',
            'Control+K /'
        );
    });
});
