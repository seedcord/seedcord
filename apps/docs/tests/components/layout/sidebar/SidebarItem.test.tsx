import { render, screen } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { SidebarItem } from '#components/layout/sidebar/SidebarItem';

const STYLES = { item: 'item', badge: 'badge' };

describe('SidebarItem', () => {
    it('marks the row for the page you are on', () => {
        render(
            <SidebarItem label="Overview" href="/docs/packages/core/latest" icon={BookOpen} styles={STYLES} isActive />
        );
        expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    });

    it('leaves every other row unmarked', () => {
        render(
            <SidebarItem
                label="Overview"
                href="/docs/packages/core/latest"
                icon={BookOpen}
                styles={STYLES}
                isActive={false}
            />
        );
        expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    });
});
