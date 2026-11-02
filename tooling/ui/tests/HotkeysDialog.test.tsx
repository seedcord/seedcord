import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HotkeysDialog } from '#src/HotkeysDialog';

import type { Hotkey } from '#src/lib/useHotkeys';

const HOTKEYS: readonly Hotkey[] = [
    { key: 'k', mod: true, description: 'Search the guide', run: vi.fn() },
    { key: '/', description: 'Search the guide', run: vi.fn() },
    { key: 'ArrowLeft', description: 'Previous page', run: vi.fn() },
    { key: '?', description: 'Show keyboard shortcuts', run: vi.fn() },
    { key: 'ArrowRight', shift: true, description: 'Next tab', run: vi.fn() }
];

describe('HotkeysDialog', () => {
    it('lists what each key does, with the keys that do the same thing in one row', () => {
        render(<HotkeysDialog open onOpenChange={vi.fn()} hotkeys={HOTKEYS} />);

        const rows = within(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).getAllByRole('listitem');

        expect(rows.map((row) => row.textContent)).toEqual([
            expect.stringContaining('Search the guide'),
            expect.stringContaining('Previous page'),
            expect.stringContaining('Show keyboard shortcuts'),
            expect.stringContaining('Next tab')
        ]);
        expect(within(rows[0] ?? document.body).getByLabelText('Control')).toBeInTheDocument();
        expect(within(rows[0] ?? document.body).getByText('K')).toBeInTheDocument();
        expect(within(rows[0] ?? document.body).getByText('/')).toBeInTheDocument();
        expect(within(rows[1] ?? document.body).getByLabelText('Left')).toBeInTheDocument();
        expect(within(rows[2] ?? document.body).getByText('?')).toBeInTheDocument();
        expect(within(rows[3] ?? document.body).getByLabelText('Shift')).toBeInTheDocument();
        expect(within(rows[3] ?? document.body).getByLabelText('Right')).toBeInTheDocument();
    });
});
