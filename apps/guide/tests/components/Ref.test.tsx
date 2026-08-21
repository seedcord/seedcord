import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Ref } from '#components/Ref';
import { DOCS_URL } from '#lib/site';

function hrefOf(name: string): string | null {
    return screen.getByRole('link', { name }).getAttribute('href');
}

describe('Ref', () => {
    it('derives the slug from the symbol name', () => {
        render(<Ref pkg="core">Notice</Ref>);

        expect(hrefOf('Notice')).toBe(`${DOCS_URL}/packages/core/latest/notice`);
    });

    it('kebab-cases a multi-word name the way the reference site does', () => {
        render(<Ref pkg="gateway">SlashHandler</Ref>);

        expect(hrefOf('SlashHandler')).toBe(`${DOCS_URL}/packages/gateway/latest/slash-handler`);
    });

    it('turns a dotted member into a nested path', () => {
        render(<Ref pkg="core">Paginator.start</Ref>);

        expect(hrefOf('Paginator.start')).toBe(`${DOCS_URL}/packages/core/latest/paginator/start`);
    });

    it('drops a generic from the name', () => {
        render(<Ref pkg="core">Plugin&lt;Options&gt;</Ref>);

        expect(hrefOf('Plugin<Options>')).toBe(`${DOCS_URL}/packages/core/latest/plugin`);
    });

    it('opens the reference site in a new tab', () => {
        render(<Ref pkg="core">Notice</Ref>);
        const link = screen.getByRole('link', { name: 'Notice' });

        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });
});
