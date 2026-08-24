import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MobileNav } from '#components/MobileNav';

import type { GuideTab, SidebarsByTab } from '#lib/nav';

const TABS: readonly GuideTab[] = [
    { label: 'Start', href: '/docs' },
    { label: 'Tooling', href: '/docs/tooling' }
];

const SIDEBARS: SidebarsByTab = {
    '/docs': [{ links: [{ label: 'Install', href: '/docs/install' }] }],
    '/docs/tooling': [{ links: [{ label: 'The CLI', href: '/docs/tooling/cli' }] }]
};

function renderNav(activeHref = '/docs'): ReturnType<typeof render> {
    return render(
        <MobileNav
            tabs={TABS}
            activeHref={activeHref}
            sidebars={SIDEBARS}
            pathname="/docs/install"
            onNavigate={vi.fn()}
        />
    );
}

describe('MobileNav', () => {
    it('lists the picked section pages without leaving the page', async () => {
        const user = userEvent.setup();
        renderNav();

        expect(screen.getByRole('link', { name: 'Install' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Section' }));
        const tooling = await screen.findByRole('option', { name: 'Tooling' });
        await user.click(tooling);

        await waitFor(() => {
            expect(screen.getByRole('link', { name: 'The CLI' })).toBeInTheDocument();
        });
        expect(screen.queryByRole('link', { name: 'Install' })).toBeNull();
    });

    it('follows the page you are on until you pick a section', () => {
        const { rerender } = renderNav();

        rerender(
            <MobileNav
                tabs={TABS}
                activeHref="/docs/tooling"
                sidebars={SIDEBARS}
                pathname="/docs/tooling/cli"
                onNavigate={vi.fn()}
            />
        );

        expect(screen.getByRole('link', { name: 'The CLI' })).toBeInTheDocument();
    });
});
