import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HotkeysDialog } from '#src/HotkeysDialog';

import type { Hotkey } from '#src/lib/useHotkeys';

const HOTKEYS: readonly Hotkey[] = [
    { key: 'k', mod: true, description: 'Search the guide', run: vi.fn() },
    { key: 'ArrowLeft', description: 'Previous page', run: vi.fn() },
    { key: '?', description: 'Show keyboard shortcuts', run: vi.fn() }
];

describe('HotkeysDialog', () => {
    it('lists every row with its keys and what it does', () => {
        render(<HotkeysDialog open onOpenChange={vi.fn()} hotkeys={HOTKEYS} />);

        const rows = within(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).getAllByRole('listitem');

        expect(rows.map((row) => row.textContent)).toEqual([
            expect.stringContaining('Search the guide'),
            expect.stringContaining('Previous page'),
            expect.stringContaining('Show keyboard shortcuts')
        ]);
        expect(within(rows[0] ?? document.body).getByLabelText('Control')).toBeInTheDocument();
        expect(within(rows[0] ?? document.body).getByText('K')).toBeInTheDocument();
        expect(within(rows[1] ?? document.body).getByLabelText('Left')).toBeInTheDocument();
        expect(within(rows[2] ?? document.body).getByText('?')).toBeInTheDocument();
    });
});
