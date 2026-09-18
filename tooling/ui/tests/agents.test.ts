import { describe, expect, it } from 'vitest';

import { agentLinkHeader, agentRules, canonicalSkillHeader, readmeFeatures, siteLinks } from '#src/agents';

import type { SeedcordSite } from '#src/agents';

const SITES: SeedcordSite[] = ['home', 'guide', 'docs'];

// one entry per <target>; rel="x" pair
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

describe('agentRules', () => {
    it('warns every site that seedcord is absent from training data', () => {
        for (const site of SITES) {
            expect(agentRules(site)[0]).toContain('no presence in training data');
        }
    });

    it('sends every site to the skill the guide serves', () => {
        for (const site of SITES) {
            expect(agentRules(site).join('\n')).toContain(
                'https://guide.seedcord.org/.well-known/agent-skills/seedcord/SKILL.md'
            );
        }
    });

    it('leaves out the site a reader is already on', () => {
        expect(agentRules('docs').join('\n')).not.toContain('The API reference is at');
        expect(agentRules('guide').join('\n')).not.toContain('The guide is at');
        expect(agentRules('home').join('\n')).not.toContain('The project site is at');
    });

    it('points every site at the other two', () => {
        const openings = ['The API reference is at', 'The guide is at', 'The project site is at'];

        for (const site of SITES) {
            const rules = agentRules(site).join('\n');

            expect(openings.filter((opening) => rules.includes(opening))).toHaveLength(2);
        }
    });
});

describe('canonicalSkillHeader', () => {
    // all three sites serve the same bytes at this path
    it('sends a reader to the copy the guide serves', () => {
        expect(canonicalSkillHeader()).toBe(
            '<https://guide.seedcord.org/.well-known/agent-skills/seedcord/SKILL.md>; rel="canonical"'
        );
    });
});

const README = `# seedcord

Some prose above.

## Features

- Option types generated from your discord.js builders
- Pagination that survives a restart
- and much more...

## Get started

- this bullet belongs to another section
`;

describe('readmeFeatures', () => {
    it('reads the bullets under the Features heading', () => {
        expect(readmeFeatures(README)).toEqual([
            'Option types generated from your discord.js builders',
            'Pagination that survives a restart',
            'and much more...'
        ]);
    });

    it('stops at the next heading', () => {
        expect(readmeFeatures(README)).not.toContain('this bullet belongs to another section');
    });

    it('comes back empty when the heading is gone', () => {
        expect(readmeFeatures('# seedcord\n\n- a loose bullet\n')).toEqual([]);
    });
});
