import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mdxComponents } from '#lib/mdxComponents';

const { h2: H2, h3: H3, h4: H4 } = mdxComponents;

describe('a heading', () => {
    it.each([
        ['h2', H2],
        ['h3', H3],
        ['h4', H4]
    ])('gives %s a control that copies a link to it', (_name, Heading) => {
        render(<Heading id="a-command-needs-a-route">A command needs a route</Heading>);

        expect(screen.getByRole('button', { name: /Copy link to A command needs a route/ })).toBeInTheDocument();
    });

    it('still names itself without reading the control inside it', () => {
        render(<H2 id="a-command-needs-a-route">A command needs a route</H2>);

        expect(screen.getByRole('heading', { name: 'A command needs a route' })).toBeInTheDocument();
    });
});
