import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HoverPrefetchLink } from '#components/HoverPrefetchLink';

import type { ReactElement, ReactNode } from 'react';

// shows the prefetch value next/link received
vi.mock('next/link', () => ({
    default: ({ prefetch, children, ...props }: { prefetch?: boolean | null; children: ReactNode }): ReactElement => (
        <a {...props} data-prefetch={String(prefetch)}>
            {children}
        </a>
    )
}));

describe('HoverPrefetchLink', () => {
    it('skips prefetch while the link only sits in view', () => {
        render(<HoverPrefetchLink href="/packages/core/latest">core</HoverPrefetchLink>);
        expect(screen.getByRole('link')).toHaveAttribute('data-prefetch', 'false');
    });

    it.each([
        ['hover', fireEvent.mouseEnter],
        ['touch', fireEvent.touchStart],
        ['keyboard focus', fireEvent.focus]
    ])('turns on the default prefetch on %s', (_name, fire) => {
        render(<HoverPrefetchLink href="/packages/core/latest">core</HoverPrefetchLink>);
        fire(screen.getByRole('link'));
        expect(screen.getByRole('link')).toHaveAttribute('data-prefetch', 'null');
    });
});
