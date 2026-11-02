import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SiteSwitcher } from '#src/SiteSwitcher';

import type { SiteDestination } from '#src/SiteSwitcher';
import type { ReactElement } from 'react';

const DESTINATIONS: readonly SiteDestination[] = [
    { label: 'Home', href: 'https://seedcord.org' },
    { label: 'Guide', href: 'https://seedcord.org/guide', current: true },
    { label: 'Reference', href: 'https://seedcord.org/docs' }
];

function Switcher(): ReactElement {
    const [open, setOpen] = useState(false);
    return <SiteSwitcher site="guide" destinations={DESTINATIONS} open={open} onOpenChange={setOpen} />;
}

afterEach(() => vi.unstubAllGlobals());

describe('SiteSwitcher', () => {
    it('opens the site picked with the arrow keys and Enter in a new tab, then closes', async () => {
        const open = vi.fn();
        vi.stubGlobal('open', open);
        const user = userEvent.setup();
        render(<Switcher />);

        await user.click(screen.getByRole('button', { name: 'Switch site' }));
        await user.keyboard('{ArrowDown}{Enter}');

        expect(open).toHaveBeenCalledWith('https://seedcord.org/docs', '_blank', 'noreferrer');
        expect(screen.queryByRole('listbox')).toBeNull();
    });
});
