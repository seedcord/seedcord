import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSiteHotkeys } from '#src/lib/useSiteHotkeys';
import { SiteSwitcher } from '#src/SiteSwitcher';
import { TooltipProvider } from '#src/Tooltip';

import type { Hotkey } from '#src/lib/useHotkeys';
import type { ReactElement } from 'react';

const nextPage = vi.fn();
const PAGE_ROWS: readonly Hotkey[] = [{ key: 'ArrowRight', description: 'Next page', run: nextPage }];

function Site({ searchOpen = false }: { searchOpen?: boolean }): ReactElement {
    const [search, setSearch] = useState(searchOpen);
    const site = useSiteHotkeys({
        searchLabel: 'Search',
        search: { open: search, setOpen: setSearch },
        panelOpen: false,
        pageRows: PAGE_ROWS
    });
    return (
        <TooltipProvider>
            <SiteSwitcher site="guide" destinations={[{ label: 'Home', href: '/' }]} {...site.switcher} />
            <p>{search ? 'search open' : 'search closed'}</p>
        </TooltipProvider>
    );
}

describe('useSiteHotkeys', () => {
    it('keeps page keys off while the switcher is open, and lets s close it back to the page', () => {
        nextPage.mockClear();
        render(<Site />);

        fireEvent.keyDown(document.body, { key: 's' });
        const list = screen.getByRole('listbox', { name: 'Sites' });
        fireEvent.keyDown(list, { key: 'ArrowRight' });
        fireEvent.keyDown(list, { key: 's' });

        expect(nextPage).not.toHaveBeenCalled();
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(screen.getByRole('button', { name: 'Switch site' })).not.toHaveFocus();
    });

    it('gives focus back to the switcher after a click opened it', async () => {
        const user = userEvent.setup();
        render(<Site />);
        const trigger = screen.getByRole('button', { name: 'Switch site' });

        await user.click(trigger);
        await user.keyboard('{Escape}');

        expect(trigger).toHaveFocus();
    });

    it('runs only the search keys while search is open', () => {
        render(<Site searchOpen />);

        fireEvent.keyDown(document.body, { key: 's' });
        expect(screen.queryByRole('listbox')).toBeNull();

        fireEvent.keyDown(document.body, { key: 'k', metaKey: true });
        expect(screen.getByText('search closed')).toBeInTheDocument();
    });
});
