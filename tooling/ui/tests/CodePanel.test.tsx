import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodePanel } from '@/CodePanel';
import type { CodeRepresentation } from '@/types/CodeRepresentation';

function rep(overrides: Partial<CodeRepresentation> = {}): CodeRepresentation {
    return { text: 'const x = 1;', html: null, ...overrides };
}

describe('CodePanel', () => {
    it('renders representation.html via dangerouslySetInnerHTML when html is present', () => {
        const { container } = render(<CodePanel representation={rep({ html: '<span class="tok">hello</span>' })} />);
        const injected = container.querySelector('span.tok');
        expect(injected).not.toBeNull();
        expect(injected?.textContent).toBe('hello');
        expect(container.querySelector('pre > code')).toBeNull();
    });

    it('falls back to <pre><code> text rendering when html is null', () => {
        const { container } = render(<CodePanel representation={rep({ text: 'fallback-text', html: null })} />);
        const code = container.querySelector('pre > code');
        expect(code).not.toBeNull();
        expect(code?.textContent).toBe('fallback-text');
    });

    it('renders the header when title is provided', () => {
        render(<CodePanel representation={rep()} title="Declaration" />);
        expect(screen.getByText('Declaration')).toBeInTheDocument();
    });

    it('renders the header when description is provided', () => {
        render(<CodePanel representation={rep()} description="Some description" />);
        expect(screen.getByText('Some description')).toBeInTheDocument();
    });

    it('omits the header when neither title nor description is provided', () => {
        const { container } = render(<CodePanel representation={rep({ text: 'no header' })} />);
        expect(container.querySelector('header')).toBeNull();
        expect(screen.queryByText('no header', { selector: 'h2,h3,p' })).toBeNull();
    });
});
