import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Navbar } from '#components/header/Navbar';
import { CommandPaletteProvider, useCommandPaletteOpen } from '#components/providers/CommandPaletteProvider';

import type { ReactElement } from 'react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/docs' }));

function OpenState(): ReactElement {
    const { open } = useCommandPaletteOpen();
    return <p>{open ? 'open' : 'closed'}</p>;
}

describe('Navbar', () => {
    it('opens the palette on Cmd+K and closes it on the next press', () => {
        render(
            <CommandPaletteProvider>
                <Navbar />
                <OpenState />
            </CommandPaletteProvider>
        );
        expect(screen.getByText('closed')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(screen.getByText('open')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(screen.getByText('closed')).toBeInTheDocument();
    });
});
