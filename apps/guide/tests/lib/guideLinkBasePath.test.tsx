import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mdxComponents } from '#lib/mdxComponents';

import type { ComponentProps, ReactElement } from 'react';

// next/link adds the basePath it inlines at build time
vi.mock('next/link', () => ({
    default: ({ href, ...props }: ComponentProps<'a'>): ReactElement => <a {...props} href={`/guide${href ?? ''}`} />
}));

const { a: Link } = mdxComponents;

describe('a link and the guide path', () => {
    it('puts a link in the guide under the guide path', () => {
        render(<Link href="/gateway-or-http">gateway or http</Link>);

        expect(screen.getByRole('link')).toHaveAttribute('href', '/guide/gateway-or-http');
    });

    it('leaves a link off the guide as written', () => {
        render(<Link href="https://discord.com/developers/applications">the portal</Link>);

        expect(screen.getByRole('link')).toHaveAttribute('href', 'https://discord.com/developers/applications');
    });
});
