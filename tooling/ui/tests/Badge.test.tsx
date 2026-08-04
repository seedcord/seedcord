import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/Badge';

function getBadge(container: HTMLElement): HTMLSpanElement {
    const el = container.querySelector('span');
    if (!el) throw new Error('Badge span not found');
    return el;
}

describe('Badge behavior', () => {
    it('renders a <span> with the provided children', () => {
        const { container } = render(<Badge>hello</Badge>);
        const el = getBadge(container);
        expect(el.tagName).toBe('SPAN');
        expect(el).toHaveTextContent('hello');
    });

    it('renders without children', () => {
        const { container } = render(<Badge />);
        expect(getBadge(container).tagName).toBe('SPAN');
    });

    it('forwards arbitrary HTML attributes to the span', () => {
        const { container } = render(<Badge id="b1" data-testid="badge" aria-label="status" />);
        const el = getBadge(container);
        expect(el).toHaveAttribute('id', 'b1');
        expect(el).toHaveAttribute('data-testid', 'badge');
        expect(el).toHaveAttribute('aria-label', 'status');
    });

    it('forwards ref to the underlying span', () => {
        let captured: HTMLSpanElement | null = null;
        render(
            <Badge
                ref={(node) => {
                    captured = node;
                }}
            />
        );
        expect(captured).toBeInstanceOf(HTMLSpanElement);
    });
});
