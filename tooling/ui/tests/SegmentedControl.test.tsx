import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from '#src/SegmentedControl';

import type { SegmentedControlOption } from '#src/SegmentedControl';
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
    it('leaves options without a disabled flag interactive', () => {
        render(<Harness />);
        for (const r of screen.getAllByRole('radio')) {
            expect(r).not.toBeDisabled();
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

describe('SegmentedControl disabled option', () => {
    const WITH_DISABLED: readonly SegmentedControlOption<View>[] = [
        { value: 'list', label: 'List' },
        { value: 'grid', label: 'Grid', disabled: true },
        { value: 'table', label: 'Table' }
    ];

    it('renders the disabled option as a non-interactive radio', () => {
        render(
            <SegmentedControl aria-label="View mode" options={WITH_DISABLED} value="list" onChange={() => undefined} />
        );
        expect(screen.getByRole('radio', { name: 'Grid' })).toBeDisabled();
        expect(screen.getByRole('radio', { name: 'List' })).not.toBeDisabled();
    });

    it('does not fire onChange when a disabled option is clicked', async () => {
        const user = userEvent.setup();
        const spy = vi.fn();
        render(<SegmentedControl aria-label="View mode" options={WITH_DISABLED} value="list" onChange={spy} />);
        await user.click(screen.getByRole('radio', { name: 'Grid' }));
        expect(spy).not.toHaveBeenCalled();
    });

    it('reflects selection on a disabled option', () => {
        const { container } = render(
            <SegmentedControl aria-label="View mode" options={WITH_DISABLED} value="grid" onChange={() => undefined} />
        );
        const grid = screen.getByRole('radio', { name: 'Grid' });
        expect(grid).toBeDisabled();
        expect(grid).toHaveAttribute('aria-checked', 'true');
        expect(grid.querySelector('[aria-hidden="true"]')).not.toBeNull();
        expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    });
});

describe('SegmentedControl full-width layout', () => {
    it('stretches the group and every option when fullWidth is set', () => {
        render(
            <SegmentedControl
                aria-label="View mode"
                options={OPTIONS}
                value="list"
                onChange={() => undefined}
                fullWidth
            />
        );
        expect(screen.getByRole('radiogroup', { name: 'View mode' }).className).toContain('w-full');
        for (const r of screen.getAllByRole('radio')) {
            expect(r.className).toContain('flex-1');
        }
    });

    it('does not stretch by default', () => {
        render(<SegmentedControl aria-label="View mode" options={OPTIONS} value="list" onChange={() => undefined} />);
        expect(screen.getByRole('radiogroup', { name: 'View mode' }).className).not.toContain('w-full');
    });
});

describe('SegmentedControl reduced-motion behaviour', () => {
    it('renders the same static markup whether or not prefers-reduced-motion is set', () => {
        // justified: jsdom omits matchMedia; stub it to report a reduced-motion preference so motion/react sees the same signal a real browser would surface.
        const original = (globalThis as { matchMedia?: unknown }).matchMedia;
        Object.defineProperty(globalThis, 'matchMedia', {
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
                delete (globalThis as { matchMedia?: unknown }).matchMedia;
            } else {
                Object.defineProperty(globalThis, 'matchMedia', {
                    configurable: true,
                    writable: true,
                    value: original
                });
            }
        }
    });
});
