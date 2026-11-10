import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { emptyMessage, useGuideSearch } from '#components/useGuideSearch';

import type { ResultGroup } from '#components/useGuideSearch';
import type { GuideSection } from '@seedcord/docs-search';

const TYPING_PAUSE_MS = 250;

const ANSWERS: Record<string, { path: string; page: string }[]> = {
    cooldown: [{ path: '/checks/cooldown', page: 'Cooldowns' }],
    kysely: [{ path: '/plugins/kysely', page: 'Kysely' }]
};

// an Error rejects the fetch the way a lost connection does
type Reply = Response | Error;

interface Server {
    answer(question: string, reply?: Reply): Promise<void>;
    signals: Map<string, AbortSignal | undefined>;
    sectionLoads(): number;
}

// sections.json answers right away, with each reply in turn. each question waits until the test answers it
function serving(sections: Response[] = []): Server {
    const pending = new Map<string, (reply: Reply | undefined) => void>();
    const signals = new Map<string, AbortSignal | undefined>();
    let sectionLoads = 0;
    vi.stubGlobal('fetch', (input: string | URL, init?: RequestInit) => {
        const url = new URL(input, 'https://seedcord.org');
        if (url.pathname.endsWith('/sections.json')) {
            sectionLoads += 1;
            return Promise.resolve(sections.shift() ?? Response.json([]));
        }
        const question = url.searchParams.get('q') ?? '';
        signals.set(question, init?.signal ?? undefined);
        return new Promise<Response>((resolve, reject) => {
            pending.set(question, (reply) => {
                if (reply instanceof Error) reject(reply);
                else resolve(reply ?? Response.json(ANSWERS[question] ?? []));
            });
        });
    });
    return {
        signals,
        sectionLoads: () => sectionLoads,
        answer: async (question, reply) => {
            await act(() => {
                pending.get(question)?.(reply);
                return vi.advanceTimersByTimeAsync(0);
            });
        }
    };
}

const groupOf = (groups: readonly ResultGroup[], label: string): ResultGroup | undefined =>
    groups.find((group) => group.label === label);

const noticeOf = (groups: readonly ResultGroup[], label: string): string | undefined => {
    const group = groupOf(groups, label);
    return group?.status === 'failed' ? group.notice : undefined;
};

const shown = (groups: readonly ResultGroup[]): { label: string; status: ResultGroup['status']; paths: string[] }[] =>
    groups.map((group) => ({
        label: group.label,
        status: group.status,
        paths: group.status === 'failed' ? [] : group.results.map((result) => result.path)
    }));

const matchedPaths = (groups: readonly ResultGroup[]): string[] =>
    shown(groups).find((group) => group.label === 'Matches')?.paths ?? [];

const SECTIONS: GuideSection[] = [
    { path: '/checks/cooldown/', tab: 'Checks', page: 'Cooldowns', text: 'Limit how often a command runs.' }
];

// the hook keeps the loaded sections for the life of the module
async function freshSearch(): Promise<typeof useGuideSearch> {
    vi.resetModules();
    return (await import('#components/useGuideSearch')).useGuideSearch;
}

async function pauseTyping(): Promise<void> {
    await act(() => vi.advanceTimersByTimeAsync(TYPING_PAUSE_MS));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

const matchedRows = (groups: readonly ResultGroup[]): readonly unknown[] => {
    const group = groupOf(groups, 'Matches');
    return group?.status === 'done' ? group.results : [];
};

describe('useGuideSearch', () => {
    it('keeps the same match rows while related results arrive', async () => {
        const { answer } = serving([Response.json(SECTIONS)]);
        const search = await freshSearch();
        const { result } = renderHook(() => search('cooldown', true).groups);
        await act(() => vi.advanceTimersByTimeAsync(0));
        const [before] = matchedRows(result.current);

        await pauseTyping();
        await answer('cooldown');

        expect(groupOf(result.current, 'Related')?.status).toBe('done');
        expect(matchedRows(result.current)[0]).toBe(before);
    });

    it('says nothing matched once every group comes back empty', async () => {
        serving([Response.json(SECTIONS)]);
        const search = await freshSearch();
        const { result } = renderHook(() => search('z', true).groups);
        await act(() => vi.advanceTimersByTimeAsync(0));

        expect(emptyMessage('z', result.current)).toBe('No matches for “z”.');
    });

    it('keeps the last related results on screen until the next answer arrives', async () => {
        const { answer } = serving();
        const { result, rerender } = renderHook(({ typed }) => useGuideSearch(typed, true).groups, {
            initialProps: { typed: 'cooldown' }
        });
        await pauseTyping();
        await answer('cooldown');
        expect(shown(result.current)).toEqual([{ label: 'Related', status: 'done', paths: ['/checks/cooldown'] }]);

        rerender({ typed: 'kysely' });
        expect(shown(result.current)).toEqual([{ label: 'Related', status: 'pending', paths: ['/checks/cooldown'] }]);

        await pauseTyping();
        await answer('kysely');
        expect(shown(result.current)).toEqual([{ label: 'Related', status: 'done', paths: ['/plugins/kysely'] }]);
    });

    it('forgets the last related results once the box is empty', async () => {
        const { answer } = serving();
        const { result, rerender } = renderHook(({ typed }) => useGuideSearch(typed, true).groups, {
            initialProps: { typed: 'cooldown' }
        });
        await pauseTyping();
        await answer('cooldown');

        rerender({ typed: '' });
        rerender({ typed: 'kysely' });

        expect(shown(result.current)).toEqual([{ label: 'Related', status: 'pending', paths: [] }]);
    });

    it('answers a question it already asked right away, without asking again', async () => {
        const { answer, signals } = serving();
        const { result, rerender } = renderHook(({ typed }) => useGuideSearch(typed, true).groups, {
            initialProps: { typed: 'cooldown' }
        });
        await pauseTyping();
        await answer('cooldown');
        const asked = signals.get('cooldown');

        rerender({ typed: 'cooldow' });
        await pauseTyping();
        await answer('cooldow');
        rerender({ typed: 'cooldown' });
        expect(shown(result.current)).toEqual([{ label: 'Related', status: 'done', paths: ['/checks/cooldown'] }]);

        await pauseTyping();
        expect(signals.get('cooldown')).toBe(asked);
    });

    it('adds the opening text of each related section once the sections load', async () => {
        const { answer } = serving([Response.json(SECTIONS)]);
        const search = await freshSearch();
        const { result } = renderHook(() => search('slow them down', true).groups);
        await act(() => vi.advanceTimersByTimeAsync(0));
        await pauseTyping();
        await answer(
            'slow them down',
            Response.json([{ path: '/checks/cooldown/', tab: 'Checks', page: 'Cooldowns' }])
        );

        expect(groupOf(result.current, 'Related')).toMatchObject({
            status: 'done',
            results: [{ excerpt: 'Limit how often a command runs.' }]
        });
    });

    it('reads the error codes from what is typed now, without waiting for an answer', () => {
        serving();
        const { result, rerender } = renderHook(({ typed }) => useGuideSearch(typed, true), {
            initialProps: { typed: 'port 3102 is busy' }
        });
        const mention = { code: 3102, name: 'CliConfigNotFound' };
        expect(result.current.codes).toMatchObject({ swapped: [], hints: [mention] });

        rerender({ typed: 'error 3102' });
        expect(result.current.codes).toMatchObject({ swapped: [mention], hints: [] });

        for (const typed of ['what', '']) {
            rerender({ typed });
            expect(result.current.codes).toMatchObject({ swapped: [], hints: [] });
        }
    });

    it('cancels the request for a question the reader typed past', async () => {
        const { signals } = serving();
        const { rerender } = renderHook(({ typed }) => useGuideSearch(typed, true), {
            initialProps: { typed: 'cooldown' }
        });
        await pauseTyping();

        rerender({ typed: 'kysely' });

        expect(signals.get('cooldown')?.aborted).toBe(true);
    });

    it('says why related results failed, asks again on the next open, and keeps an answer it has', async () => {
        const { answer, signals } = serving();
        const { result, rerender } = renderHook(({ typed, open }) => useGuideSearch(typed, open).groups, {
            initialProps: { typed: 'cooldown', open: true }
        });
        await pauseTyping();
        await answer('cooldown', new Response(null, { status: 429, headers: { 'retry-after': '60' } }));
        expect(noticeOf(result.current, 'Related')).toBe('Too many searches. Try again in 1 minute.');

        rerender({ typed: 'kysely', open: true });
        await pauseTyping();
        await answer('kysely', new TypeError('Failed to fetch'));
        expect(noticeOf(result.current, 'Related')).toBe("Related results can't load without a network connection.");

        rerender({ typed: 'kysely', open: false });
        rerender({ typed: 'kysely', open: true });
        await pauseTyping();
        await answer('kysely');
        expect(shown(result.current)).toEqual([{ label: 'Related', status: 'done', paths: ['/plugins/kysely'] }]);

        const answered = signals.get('kysely');
        rerender({ typed: 'kysely', open: false });
        rerender({ typed: 'kysely', open: true });
        await pauseTyping();
        expect(signals.get('kysely')).toBe(answered);
    });

    it('reports a lost connection only when the request never reached the server', async () => {
        const { answer } = serving();
        const { result } = renderHook(() => useGuideSearch('cooldown', true).groups);
        await pauseTyping();
        await answer('cooldown', Response.json({ error: 'not a list of hits' }));

        expect(noticeOf(result.current, 'Related')).toBe(
            'Related results are unavailable right now. Close and reopen search to try again.'
        );
    });

    it('loads the guide sections once the dialog opens, and again on the next open after a failure', async () => {
        const { sectionLoads } = serving([new Response(null, { status: 503 }), Response.json(SECTIONS)]);
        const search = await freshSearch();
        const { result, rerender } = renderHook(({ open }) => search('cool', open).groups, {
            initialProps: { open: false }
        });
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(sectionLoads()).toBe(0);

        rerender({ open: true });
        expect(groupOf(result.current, 'Matches')?.status).toBe('pending');
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(noticeOf(result.current, 'Matches')).toBe(
            'Matches are unavailable right now. Close and reopen search to try again.'
        );

        rerender({ open: false });
        rerender({ open: true });
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(matchedPaths(result.current)).toEqual(['/checks/cooldown/']);
    });
});
