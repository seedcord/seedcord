import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CommandPaletteProvider, useCommandPaletteOpen } from '#components/providers/CommandPaletteProvider';

import type { ReactElement } from 'react';

function OpenState(): ReactElement {
    const { open } = useCommandPaletteOpen();
    return <p>{open ? 'open' : 'closed'}</p>;
}

describe('CommandPaletteProvider', () => {
    it('opens the palette on Cmd+K and closes it on the next press', () => {
        render(
            <CommandPaletteProvider>
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
