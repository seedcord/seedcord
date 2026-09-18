import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AgentLinks } from '#src/AgentLinks';
import { siteLinks } from '#src/agents';

function headHrefs(): Map<string, string> {
    const found = new Map<string, string>();

    for (const tag of document.head.querySelectorAll('link')) found.set(tag.rel, tag.getAttribute('href') ?? '');

    return found;
}

describe('AgentLinks', () => {
    it('puts every one of the site relations in the head', () => {
        render(<AgentLinks site="docs" />);
        const rendered = headHrefs();

        for (const { rel, href } of siteLinks('docs')) expect(rendered.get(rel)).toBe(href);
    });
});
