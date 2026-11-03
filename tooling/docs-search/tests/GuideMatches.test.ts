import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { GuideMatches } from '#src/GuideMatches';

import type { GuideSection } from '#src/guideSections';

const SECTIONS: GuideSection[] = [
    { path: '/events/', tab: 'Events', page: 'Event handlers', text: 'Listen to a gateway event.' },
    {
        path: '/events/#several-handlers-for-one-event',
        tab: 'Events',
        page: 'Event handlers',
        heading: 'Several handlers for one event',
        text: 'Register two classes on the same event.'
    },
    { path: '/checks/cooldown/', tab: 'Checks', page: 'Cooldowns', text: 'Stop someone spamming a command.' }
];

const heading = (path: string, page: string, title: string): GuideSection => ({
    path,
    tab: 'Checks',
    page,
    heading: title,
    text: ''
});

const paths = (matches: GuideMatches, input: string): string[] => matches.match(input).map((result) => result.path);

afterEach(() => vi.unstubAllGlobals());

describe('GuideMatches', () => {
    it('loads the sections file from the site it runs on', async () => {
        const asked: string[] = [];
        vi.stubGlobal('fetch', (path: string) => {
            asked.push(path);
            return Promise.resolve(Response.json(SECTIONS));
        });

        const matches = await GuideMatches.load();

        expect(asked).toEqual(['/guide/api/sections.json']);
        expect(matches.match('cool')).toEqual([
            {
                path: '/checks/cooldown/',
                tab: 'Checks',
                page: 'Cooldowns',
                url: 'https://seedcord.org/guide/checks/cooldown/',
                by: 'title',
                terms: ['cool']
            }
        ]);
    });

    it('throws with the status when the sections file fails to load', async () => {
        vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })));

        await expect(GuideMatches.load()).rejects.toThrow(/404/);
    });

    it('matches a title only when every typed word starts one of its words', () => {
        const matches = new GuideMatches(SECTIONS);

        expect(paths(matches, 'event han')).toEqual(['/events/', '/events/#several-handlers-for-one-event']);
        expect(paths(matches, 'event cooldown')).toEqual([]);
    });

    it('puts a page ahead of a heading, then a whole word ahead of a word it only starts', () => {
        const matches = new GuideMatches([
            heading('/checks/effect-gates/#cooldown', 'Effect gates', 'Cooldown'),
            heading('/checks/rate-limiter/#cooldowns-by-hand', 'Rate limiter', 'Cooldowns by hand'),
            ...SECTIONS
        ]);

        expect(paths(matches, 'cooldown')).toEqual([
            '/checks/cooldown/',
            '/checks/effect-gates/#cooldown',
            '/checks/rate-limiter/#cooldowns-by-hand'
        ]);
    });

    it('finds text pasted from a section, after the title matches, with an excerpt starting near it', () => {
        const matches = new GuideMatches([
            ...SECTIONS,
            {
                ...heading('/checks/cooldown/#who-shares-a-window', 'Cooldowns', 'Who shares a window'),
                text: "If you leave per out, every caller gets their own window.\nCooldown('1h', { per: 'guild' });"
            }
        ]);

        expect(matches.match("per: 'guild'")).toEqual([
            expect.objectContaining({
                path: '/checks/cooldown/#who-shares-a-window',
                by: 'text',
                excerpt: "…gets their own window. Cooldown('1h', { per: 'guild' });",
                terms: ["per: 'guild'"]
            })
        ]);
        expect(paths(matches, "per:   'guild'")).toEqual(['/checks/cooldown/#who-shares-a-window']);
        expect(paths(matches, 'event')).toEqual(['/events/', '/events/#several-handlers-for-one-event']);
    });

    it('matches text only where the typed phrase starts a word', () => {
        const matches = new GuideMatches([
            { ...heading('/build/config/#tools', 'Config', 'Tools'), text: 'Keep eslint.config.ts outside root.' },
            { ...heading('/checks/cooldown/#window', 'Cooldowns', 'Window'), text: 'The window is a sliding window.' }
        ]);

        expect(paths(matches, 'sli')).toEqual(['/checks/cooldown/#window']);
    });

    it('returns at most five matches, titles first', () => {
        const matches = new GuideMatches(
            ['one', 'two', 'three', 'four', 'five', 'six'].map((n) => ({
                ...heading(`/checks/cooldown/#${n}`, 'Cooldowns', `Window ${n}`),
                text: 'Every use counts inside the window.'
            }))
        );

        expect(matches.match('window').map((result) => result.by)).toEqual(['title', 'title', 'title', 'text', 'text']);
    });
});
