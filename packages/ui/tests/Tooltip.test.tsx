import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tooltip, TooltipProvider } from '@/Tooltip';

import type { RenderResult } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';

const DEFAULT_DELAY_MS = 400;
const SHORT_DELAY_MS = 100;
const ONE_MS = 1;
const JUST_BEFORE_DEFAULT_DELAY_MS = DEFAULT_DELAY_MS - ONE_MS;
const JUST_BEFORE_SHORT_DELAY_MS = SHORT_DELAY_MS - ONE_MS;
const MID_DEFAULT_DELAY_MS = DEFAULT_DELAY_MS / 2;

type TooltipOnlyProps = Omit<ComponentProps<typeof Tooltip>, 'children' | 'content'>;

interface RenderTooltipOptions extends TooltipOnlyProps {
    triggerLabel?: string;
    content?: ReactNode;
    providerProps?: Omit<ComponentProps<typeof TooltipProvider>, 'children'>;
}

function renderTooltip({
    triggerLabel = 'Trigger',
    content = 'Tooltip body',
    providerProps,
    ...tooltipProps
}: RenderTooltipOptions = {}): RenderResult {
    return render(
        <TooltipProvider {...providerProps}>
            <Tooltip content={content} {...tooltipProps}>
                <button type="button">{triggerLabel}</button>
            </Tooltip>
        </TooltipProvider>
    );
}

function hoverTrigger(trigger: HTMLElement): void {
    // justified: Radix opens on pointerMove (pointerType !== 'touch'); user-event's hover schedules through its own delay queue and races Radix's timer logic under fake timers, so drive pointer events directly via fireEvent.
    fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
}

function unhoverTrigger(trigger: HTMLElement): void {
    fireEvent.pointerLeave(trigger, { pointerType: 'mouse' });
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('Tooltip hover delay', () => {
    it('does not show content immediately on hover', () => {
        renderTooltip();
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('does not show content before the delay elapses', () => {
        renderTooltip({ providerProps: { delayDuration: DEFAULT_DELAY_MS } });
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(JUST_BEFORE_DEFAULT_DELAY_MS);
        });
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('shows content after the configured delay elapses', () => {
        renderTooltip({ providerProps: { delayDuration: DEFAULT_DELAY_MS } });
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(DEFAULT_DELAY_MS);
        });
        expect(screen.getByRole('tooltip')).toHaveTextContent('Tooltip body');
    });

    it('respects a custom delayDuration on the Provider', () => {
        renderTooltip({ providerProps: { delayDuration: SHORT_DELAY_MS } });
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(JUST_BEFORE_SHORT_DELAY_MS);
        });
        expect(screen.queryByRole('tooltip')).toBeNull();
        act(() => {
            vi.advanceTimersByTime(ONE_MS);
        });
        expect(screen.getByRole('tooltip')).toHaveTextContent('Tooltip body');
    });
});

describe('Tooltip immediate hide on leave', () => {
    it('hides as soon as the pointer leaves the trigger', () => {
        renderTooltip({ providerProps: { delayDuration: SHORT_DELAY_MS } });
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(SHORT_DELAY_MS);
        });
        expect(screen.getByRole('tooltip')).toHaveTextContent('Tooltip body');
        unhoverTrigger(trigger);
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('cancels a pending open if the pointer leaves before the delay elapses', () => {
        renderTooltip({ providerProps: { delayDuration: DEFAULT_DELAY_MS } });
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(MID_DEFAULT_DELAY_MS);
        });
        unhoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(DEFAULT_DELAY_MS);
        });
        expect(screen.queryByRole('tooltip')).toBeNull();
    });
});

describe('Tooltip side variants -> data-side', () => {
    const sides = ['top', 'right', 'bottom', 'left'] as const;

    function getPopperContent(): HTMLElement {
        // justified: Radix renders a visually-hidden span owning role="tooltip" alongside the visible popper panel; data-side lives only on the visible panel.
        const panel = document.querySelector<HTMLElement>('[data-radix-popper-content-wrapper] [data-side]');
        if (!panel) throw new Error('popper content not rendered');
        return panel;
    }

    it.each(sides)('renders content with data-side="%s"', (side) => {
        renderTooltip({ side, providerProps: { delayDuration: 0 } });
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(0);
        });
        expect(getPopperContent()).toHaveAttribute('data-side', side);
    });

    it('defaults to side="top" when no side prop is provided', () => {
        renderTooltip({ providerProps: { delayDuration: 0 } });
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(0);
        });
        expect(getPopperContent()).toHaveAttribute('data-side', 'top');
    });
});

describe('Tooltip aria-describedby linkage', () => {
    it('omits aria-describedby on the trigger while closed', () => {
        renderTooltip();
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        expect(trigger).not.toHaveAttribute('aria-describedby');
    });

    it('links aria-describedby on the trigger to the tooltip id once open', () => {
        renderTooltip({ providerProps: { delayDuration: 0 } });
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(0);
        });
        const describedBy = trigger.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip.id).toBe(describedBy);
    });

    it('drops aria-describedby again once the trigger is unhovered', () => {
        renderTooltip({ providerProps: { delayDuration: 0 } });
        const trigger = screen.getByRole('button', { name: 'Trigger' });
        hoverTrigger(trigger);
        act(() => {
            vi.advanceTimersByTime(0);
        });
        expect(trigger).toHaveAttribute('aria-describedby');
        unhoverTrigger(trigger);
        expect(trigger).not.toHaveAttribute('aria-describedby');
    });
});
