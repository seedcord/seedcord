import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { HotkeysDialog } from '#src/HotkeysDialog.tsx';

import type { Hotkey } from '#src/lib/useHotkeys.ts';

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
        // key names come from screen-reader-only text
        expect(rows[0]).toHaveTextContent(/Control.*K.*or.*\//);
        expect(rows[1]).toHaveTextContent('Left');
        expect(rows[2]).toHaveTextContent('?');
        expect(rows[3]).toHaveTextContent(/Shift.*Right/);
    });
});
