import { TooltipProvider } from '@seedcord/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';

import { PageNav } from '#components/PageNav';

import type { PageNeighbours } from '#lib/neighbours';
import type { RenderResult } from '@testing-library/react';

const PREVIOUS = { tab: 'Gates', label: 'Permissions in a handler', href: '/gates/in-handler-permissions' };
const NEXT = { tab: 'Plugins', label: 'Plugins', href: '/plugins' };

function renderNav(neighbours: PageNeighbours): RenderResult {
    return render(<PageNav {...neighbours} />, { wrapper: TooltipProvider });
}

describe('PageNav', () => {
    it('links each neighbour by its title, with the arrow key that opens it', () => {
        renderNav({ previous: PREVIOUS, next: NEXT });

        const previous = screen.getByRole('link', { name: /Permissions in a handler/ });
        const next = screen.getByRole('link', { name: /Plugins/ });
        expect(previous).toHaveAttribute('href', '/gates/in-handler-permissions');
        expect(previous).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft');
        expect(next).toHaveAttribute('href', '/plugins');
        expect(next).toHaveAttribute('aria-keyshortcuts', 'ArrowRight');
    });

    it('shows the tab the neighbour is under', () => {
        renderNav({ previous: PREVIOUS });

        expect(screen.getByText('Previous · Gates')).toBeInTheDocument();
    });

    it('omits the tab from a page named after it', () => {
        renderNav({ next: NEXT });

        expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('leaves out the direction where a page lacks a neighbour', () => {
        renderNav({ next: NEXT });

        expect(screen.queryByText(/Previous/)).not.toBeInTheDocument();
    });

    it('renders nothing on a page standing alone', () => {
        const { container } = renderNav({});

        expect(container).toBeEmptyDOMElement();
    });
});
