import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageNav } from '#components/PageNav';

const PREVIOUS = { tab: 'Gates', label: 'Permissions in a handler', href: '/gates/in-handler-permissions' };
const NEXT = { tab: 'Plugins', label: 'Plugins', href: '/plugins' };

describe('PageNav', () => {
    it('links each neighbour by its title', () => {
        render(<PageNav previous={PREVIOUS} next={NEXT} />);

        expect(screen.getByRole('link', { name: /Permissions in a handler/ })).toHaveAttribute(
            'href',
            '/gates/in-handler-permissions'
        );
        expect(screen.getByRole('link', { name: /Plugins/ })).toHaveAttribute('href', '/plugins');
    });

    it('names the tab the neighbour sits under', () => {
        render(<PageNav previous={PREVIOUS} />);

        expect(screen.getByText('Previous · Gates')).toBeInTheDocument();
    });

    it('drops the tab from a page named after it', () => {
        render(<PageNav next={NEXT} />);

        expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('leaves out the direction a page has no neighbour in', () => {
        render(<PageNav next={NEXT} />);

        expect(screen.queryByText(/Previous/)).not.toBeInTheDocument();
    });

    it('renders nothing on a page standing alone', () => {
        const { container } = render(<PageNav />);

        expect(container).toBeEmptyDOMElement();
    });
});
