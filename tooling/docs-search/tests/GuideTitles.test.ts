import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuideTitles } from '#src/GuideTitles';

import type { GuideHit } from '#src/guideSections';

const HITS: GuideHit[] = [
    { path: '/events', page: 'Event handlers' },
    {
        path: '/events#several-handlers-for-one-event',
        page: 'Event handlers',
        heading: 'Several handlers for one event'
    },
    { path: '/checks/cooldown', page: 'Cooldowns' }
];

const paths = (titles: GuideTitles, input: string): string[] => titles.match(input).map((result) => result.path);

afterEach(() => vi.unstubAllGlobals());

describe('GuideTitles', () => {
    it('loads the titles file from the site it runs on', async () => {
        const asked: string[] = [];
        vi.stubGlobal('fetch', (path: string) => {
            asked.push(path);
            return Promise.resolve(Response.json(HITS));
        });

        const titles = await GuideTitles.load();

        expect(asked).toEqual(['/guide/api/titles.json']);
        expect(titles.match('cool')).toEqual([
            { path: '/checks/cooldown', page: 'Cooldowns', url: 'https://seedcord.org/guide/checks/cooldown' }
        ]);
    });

    it('throws with the status when the titles file fails to load', async () => {
        vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })));

        await expect(GuideTitles.load()).rejects.toThrow(/404/);
    });

    it('matches a title only when every typed word starts one of its words', () => {
        const titles = new GuideTitles(HITS);

        expect(paths(titles, 'event han')).toEqual(['/events', '/events#several-handlers-for-one-event']);
        expect(paths(titles, 'event cooldown')).toEqual([]);
    });

    it('puts a page ahead of a heading, then a whole word ahead of a word it only starts', () => {
        const titles = new GuideTitles([
            { path: '/checks/effect-gates#cooldown', page: 'Effect gates', heading: 'Cooldown' },
            { path: '/checks/rate-limiter#cooldowns-by-hand', page: 'Rate limiter', heading: 'Cooldowns by hand' },
            ...HITS
        ]);

        expect(paths(titles, 'cooldown')).toEqual([
            '/checks/cooldown',
            '/checks/effect-gates#cooldown',
            '/checks/rate-limiter#cooldowns-by-hand'
        ]);
    });

    it('returns at most three titles', () => {
        const titles = new GuideTitles(
            ['one', 'two', 'three', 'four'].map((n) => ({
                path: `/events#${n}`,
                page: 'Events',
                heading: `Event ${n}`
            }))
        );

        expect(paths(titles, 'event')).toHaveLength(3);
    });
});
