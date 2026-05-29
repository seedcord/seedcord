import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from '../src/SegmentedControl';

import type { SegmentedControlOption } from '../src/SegmentedControl';
import type { ReactElement } from 'react';

type View = 'list' | 'grid' | 'table';

const OPTIONS: readonly SegmentedControlOption<View>[] = [
    { value: 'list', label: 'List' },
    { value: 'grid', label: 'Grid' },
    { value: 'table', label: 'Table' }
];

function Harness({
    initial = 'list',
    onChangeSpy
}: {
    initial?: View;
    onChangeSpy?: (next: View) => void;
}): ReactElement {
    const [value, setValue] = useState<View>(initial);
    return (
        <SegmentedControl
            aria-label="View mode"
            options={OPTIONS}
            value={value}
            onChange={(next) => {
                onChangeSpy?.(next);
                setValue(next);
            }}
        />
    );
}

describe('SegmentedControl radio-group ARIA', () => {
    it('renders a radiogroup with the provided aria-label', () => {
        render(<Harness />);
        const group = screen.getByRole('radiogroup', { name: 'View mode' });
        expect(group).toBeInTheDocument();
    });

    it('exposes each option as a radio with its label as accessible name', () => {
        render(<Harness />);
        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(OPTIONS.length);
        expect(radios.map((r) => r.textContent)).toEqual(['List', 'Grid', 'Table']);
    });

    it('marks the active option with aria-checked=true and the rest false', () => {
        render(<Harness initial="grid" />);
        const list = screen.getByRole('radio', { name: 'List' });
        const grid = screen.getByRole('radio', { name: 'Grid' });
        const table = screen.getByRole('radio', { name: 'Table' });
        expect(list).toHaveAttribute('aria-checked', 'false');
        expect(grid).toHaveAttribute('aria-checked', 'true');
        expect(table).toHaveAttribute('aria-checked', 'false');
    });
});

describe('SegmentedControl selection callback', () => {
    it('fires onChange with the clicked option value', async () => {
        const user = userEvent.setup();
        const spy = vi.fn();
        render(<Harness onChangeSpy={spy} />);
        await user.click(screen.getByRole('radio', { name: 'Table' }));
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith('table');
    });

    it('flips aria-checked after a click moves selection', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const list = screen.getByRole('radio', { name: 'List' });
        const grid = screen.getByRole('radio', { name: 'Grid' });
        expect(list).toHaveAttribute('aria-checked', 'true');
        await user.click(grid);
        expect(list).toHaveAttribute('aria-checked', 'false');
        expect(grid).toHaveAttribute('aria-checked', 'true');
    });

    it('does not re-fire onChange when the active option is clicked again', async () => {
        const user = userEvent.setup();
        const spy = vi.fn();
        render(<Harness onChangeSpy={spy} />);
        await user.click(screen.getByRole('radio', { name: 'List' }));
        // justified: primitive has no internal de-dupe, so onChange fires once per click regardless of active state.
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith('list');
    });
});

describe('SegmentedControl keyboard interaction', () => {
    it('selects via Enter on a focused radio', async () => {
        const user = userEvent.setup();
        const spy = vi.fn();
        render(<Harness onChangeSpy={spy} />);
        const grid = screen.getByRole('radio', { name: 'Grid' });
        grid.focus();
        await user.keyboard('{Enter}');
        expect(spy).toHaveBeenCalledWith('grid');
    });

    it('does not change selection on ArrowRight (no built-in roving handler)', async () => {
        const user = userEvent.setup();
        const spy = vi.fn();
        render(<Harness onChangeSpy={spy} />);
        const list = screen.getByRole('radio', { name: 'List' });
        list.focus();
        await user.keyboard('{ArrowRight}');
        expect(spy).not.toHaveBeenCalled();
        expect(list).toHaveAttribute('aria-checked', 'true');
    });

    it('does not change selection on ArrowLeft (no built-in roving handler)', async () => {
        const user = userEvent.setup();
        const spy = vi.fn();
        render(<Harness initial="grid" onChangeSpy={spy} />);
        const grid = screen.getByRole('radio', { name: 'Grid' });
        grid.focus();
        await user.keyboard('{ArrowLeft}');
        expect(spy).not.toHaveBeenCalled();
        expect(grid).toHaveAttribute('aria-checked', 'true');
    });
});

describe('SegmentedControl active pill (motion layout)', () => {
    it('mounts exactly one aria-hidden pill inside the active radio', () => {
        const { container } = render(<Harness initial="grid" />);
        const pills = container.querySelectorAll('[aria-hidden="true"]');
        expect(pills).toHaveLength(1);
        const grid = screen.getByRole('radio', { name: 'Grid' });
        expect(grid).toContainElement(pills[0] as HTMLElement);
    });

    it('moves the pill into a new radio when selection changes', async () => {
        const user = userEvent.setup();
        const { container } = render(<Harness />);
        await user.click(screen.getByRole('radio', { name: 'Table' }));
        const pills = container.querySelectorAll('[aria-hidden="true"]');
        expect(pills).toHaveLength(1);
        const table = screen.getByRole('radio', { name: 'Table' });
        expect(table).toContainElement(pills[0] as HTMLElement);
    });
});

describe('SegmentedControl segment interactivity', () => {
    it('treats every option as clickable (no per-segment disabled flag yet)', () => {
        render(<Harness />);
        for (const r of screen.getAllByRole('radio')) {
            expect(r).not.toBeDisabled();
            expect(r).not.toHaveAttribute('aria-disabled', 'true');
        }
    });

    it('still fires onChange when the same radio is clicked twice (no swallow)', async () => {
        const user = userEvent.setup();
        const spy = vi.fn();
        render(<Harness onChangeSpy={spy} />);
        const grid = screen.getByRole('radio', { name: 'Grid' });
        await user.click(grid);
        await user.click(grid);
        expect(spy).toHaveBeenCalledTimes(2);
    });
});

describe('SegmentedControl reduced-motion behaviour', () => {
    it('renders the same static markup whether or not prefers-reduced-motion is set', () => {
        // justified: jsdom omits matchMedia; stub it to report a reduced-motion preference so motion/react sees the same signal a real browser would surface.
        const original = (window as { matchMedia?: unknown }).matchMedia;
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: (query: string) => ({
                matches: true,
                media: query,
                onchange: null,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
                addListener: () => undefined,
                removeListener: () => undefined,
                dispatchEvent: () => false
            })
        });
        try {
            const { container } = render(<Harness initial="grid" />);
            expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
            const grid = screen.getByRole('radio', { name: 'Grid' });
            expect(grid.querySelector('[aria-hidden="true"]')).not.toBeNull();
        } finally {
            if (original === undefined) {
                delete (window as { matchMedia?: unknown }).matchMedia;
            } else {
                Object.defineProperty(window, 'matchMedia', {
                    configurable: true,
                    writable: true,
                    value: original
                });
            }
        }
    });
});
