import { TooltipProvider } from '@seedcord/ui';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Navbar } from '#components/header/Navbar';
import { CommandPaletteProvider, useCommandPaletteOpen } from '#components/providers/CommandPaletteProvider';

import type { ReactElement } from 'react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/docs' }));

function OpenState(): ReactElement {
    const { open } = useCommandPaletteOpen();
    return <p>{open ? 'open' : 'closed'}</p>;
}

function renderNavbar(): void {
    render(
        <TooltipProvider>
            <CommandPaletteProvider>
                <Navbar />
                <OpenState />
            </CommandPaletteProvider>
        </TooltipProvider>
    );
}

describe('Navbar', () => {
    it('toggles the palette on Cmd+K and opens it on /', () => {
        renderNavbar();
        expect(screen.getByText('closed')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(screen.getByText('open')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(screen.getByText('closed')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: '/' });
        expect(screen.getByText('open')).toBeInTheDocument();
    });

    it('opens the site switcher on s and the key list on ?', () => {
        renderNavbar();

        fireEvent.keyDown(window, { key: 's' });
        expect(screen.getByRole('listbox', { name: 'Sites' })).toBeInTheDocument();
        fireEvent.keyDown(screen.getByRole('listbox', { name: 'Sites' }), { key: 'Escape' });

        fireEvent.keyDown(window, { key: '?', shiftKey: true });
        const shortcuts = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
        expect(
            within(shortcuts)
                .getAllByRole('listitem')
                .map((row) => row.textContent)
        ).toEqual([
            expect.stringContaining('Search docs'),
            expect.stringContaining('Search docs'),
            expect.stringContaining('Switch site'),
            expect.stringContaining('Show keyboard shortcuts')
        ]);
    });
});
