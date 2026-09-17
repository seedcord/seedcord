import { describe, expect, it } from 'vitest';

import { agentLinkHeader, siteLinks } from '../src/agents';

import type { SeedcordSite } from '../src/agents';

const SITES: SeedcordSite[] = ['home', 'guide', 'docs'];

// one entry per comma that sits outside angle brackets
function relationsOf(header: string): Map<string, string> {
    const found = new Map<string, string>();

    for (const [, target, rel] of header.matchAll(/<([^>]+)>;\s*rel="([^"]+)"/g)) {
        if (target !== undefined && rel !== undefined) found.set(rel, target);
    }

    return found;
}

describe('agentLinkHeader', () => {
    it('describes every site by its own llms.txt', () => {
        for (const site of SITES) {
            expect(relationsOf(agentLinkHeader(site)).get('describedby')).toBe('/llms.txt');
        }
    });

    it('points every site at its own agent-skills index', () => {
        for (const site of SITES) {
            expect(relationsOf(agentLinkHeader(site)).get('service-meta')).toBe('/.well-known/agent-skills/index.json');
        }
    });

    it('leaves out the relation a site would point at itself', () => {
        expect(relationsOf(agentLinkHeader('home')).has('index')).toBe(false);
        expect(relationsOf(agentLinkHeader('docs')).has('service-doc')).toBe(false);
    });

    it('sends a reader from the guide to the reference and to home', () => {
        const relations = relationsOf(agentLinkHeader('guide'));

        expect(relations.get('service-doc')).toBe('https://docs.seedcord.org');
        expect(relations.get('index')).toBe('https://seedcord.org');
    });

    it('sends a reader from the reference to the guide', () => {
        expect(relationsOf(agentLinkHeader('docs')).get('related')).toBe('https://guide.seedcord.org');
    });

    it('offers the markdown twin of the page it was built for', () => {
        const relations = relationsOf(agentLinkHeader('guide', '/commands/options.md'));

        expect(relations.get('alternate')).toBe('/commands/options.md');
        expect(agentLinkHeader('guide', '/commands/options.md')).toContain('type="text/markdown"');
    });

    it('offers no alternate on a page with no twin', () => {
        expect(relationsOf(agentLinkHeader('guide')).has('alternate')).toBe(false);
    });
});

describe('siteLinks', () => {
    it('carries the same relations the header sends', () => {
        for (const site of SITES) {
            const rels = siteLinks(site).map((entry) => entry.rel);

            expect(rels).toEqual([...relationsOf(agentLinkHeader(site)).keys()]);
        }
    });

    // pageMetadata already renders the twin
    it('leaves the page twin out', () => {
        expect(siteLinks('guide').some((entry) => entry.rel === 'alternate')).toBe(false);
    });
});
