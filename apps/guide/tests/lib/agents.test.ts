import { loader } from 'fumadocs-core/source';
import { describe, expect, it } from 'vitest';

import { llmsIndex, pageLinks, twinLinks } from '#lib/agents';

describe('the page list in llms.txt', () => {
    it('lists every page as a link', async () => {
        const source = loader({
            baseUrl: '/',
            source: {
                files: [
                    { type: 'page', path: 'index.mdx', data: { title: 'Introduction', description: 'What it does.' } },
                    {
                        type: 'page',
                        path: 'commands/options.mdx',
                        data: { title: 'Options', description: 'Reading input.' }
                    }
                ]
            }
        });

        const links = await pageLinks(source);

        expect(links).toContain('[Introduction](https://seedcord.org/guide/index.md): What it does.');
        expect(links).toContain('[Options](https://seedcord.org/guide/commands/options.md): Reading input.');
    });
});

describe('the links an agent follows out of llms.txt', () => {
    it('points a page link at the markdown an agent can read', () => {
        expect(twinLinks('- [Options](/commands/options): Reading input.')).toBe(
            '- [Options](https://seedcord.org/guide/commands/options.md): Reading input.'
        );
    });

    it('names the root page index', () => {
        expect(twinLinks('- [Introduction](/): What it does.')).toBe(
            '- [Introduction](https://seedcord.org/guide/index.md): What it does.'
        );
    });

    it('leaves a folder row alone, since it links nowhere', () => {
        expect(twinLinks('- **Commands**')).toBe('- **Commands**');
    });

    it('keeps the indent that shows which tab a page sits under', () => {
        expect(twinLinks('  - [Options](/commands/options)')).toContain('  - [Options](https://');
    });
});

describe('llms.txt', () => {
    it('tells an agent which package a bot installs', () => {
        expect(llmsIndex('')).toContain('@seedcord/gateway');
    });

    it('puts the instructions above the links', () => {
        const file = llmsIndex('- [Options](https://seedcord.org/guide/commands/options.md)');

        expect(file.indexOf('training data')).toBeLessThan(file.indexOf('- [Options]'));
    });
});
