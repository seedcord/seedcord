import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { DocsSidebar } from '#components/DocsSidebar';

import type { SidebarSection } from '#components/DocsSidebar';
import type { RenderResult } from '@testing-library/react';

const SECTIONS: readonly SidebarSection[] = [
    { kind: 'lead', links: [{ label: 'Plugins', href: '/plugins' }] },
    {
        kind: 'group',
        label: 'Mongoose',
        storageKey: 'test:Plugins:Mongoose',
        defaultOpen: true,
        links: [{ label: 'Setup', href: '/plugins/mongoose' }]
    },
    {
        kind: 'group',
        label: 'Kysely',
        storageKey: 'test:Plugins:Kysely',
        defaultOpen: false,
        links: [{ label: 'Schema', href: '/plugins/kysely-schema' }]
    }
];

function renderSidebar(activeHref = '/plugins'): RenderResult {
    return render(<DocsSidebar sections={SECTIONS} activeHref={activeHref} />);
}

function trigger(label: string): HTMLElement {
    return screen.getByRole('button', { name: label });
}

afterEach(() => {
    localStorage.clear();
});

describe('DocsSidebar', () => {
    it('starts each group open or closed by its defaultOpen', () => {
        renderSidebar();

        expect(trigger('Mongoose')).toHaveAttribute('aria-expanded', 'true');
        expect(trigger('Kysely')).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByRole('link', { name: 'Plugins' })).toBeVisible();
    });

    it('opens a closed group that holds the page you are on', () => {
        renderSidebar('/plugins/kysely-schema');

        expect(trigger('Kysely')).toHaveAttribute('aria-expanded', 'true');
    });

    it('keeps a group you closed closed after the sidebar remounts', async () => {
        const user = userEvent.setup();
        const { unmount } = renderSidebar();

        await user.click(trigger('Mongoose'));
        unmount();
        renderSidebar();

        expect(trigger('Mongoose')).toHaveAttribute('aria-expanded', 'false');
    });
});
