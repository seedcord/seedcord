import { expect, it } from 'vitest';

import { guideSections } from '#src/guideSections';

it('throws when text sits under a heading the page does not list', () => {
    expect(() =>
        guideSections({
            path: '/build/config',
            tab: 'Build & deploy',
            title: 'seedcord.config.ts',
            structuredData: { headings: [], contents: [{ heading: 'gone', content: 'orphaned text' }] }
        })
    ).toThrow(/\/build\/config.*gone/);
});

it('gives the page intro and each heading its own section, with the text under it', () => {
    const sections = guideSections({
        path: '/build/config',
        tab: 'Build & deploy',
        title: 'seedcord.config.ts',
        description: 'Tell the CLI where your bot lives.',
        structuredData: {
            headings: [{ id: 'every-key', content: 'Every key' }],
            contents: [
                { heading: undefined, content: 'The config file sits at the root.' },
                { heading: 'every-key', content: 'root sets the folder.' },
                { heading: 'every-key', content: 'outDir sets the build folder.' }
            ]
        }
    });

    expect(sections).toEqual([
        {
            path: '/build/config',
            tab: 'Build & deploy',
            page: 'seedcord.config.ts',
            text: 'Tell the CLI where your bot lives.\nThe config file sits at the root.'
        },
        {
            path: '/build/config#every-key',
            tab: 'Build & deploy',
            page: 'seedcord.config.ts',
            heading: 'Every key',
            text: 'root sets the folder.\noutDir sets the build folder.'
        }
    ]);
});
