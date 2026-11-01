import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuideSearch } from '#components/useGuideSearch';

import type { ResultGroup } from '#components/useGuideSearch';
import type { GuideSection } from '@seedcord/docs-search';

const TYPING_PAUSE_MS = 250;

const ANSWERS: Record<string, { path: string; page: string }[]> = {
    cooldown: [{ path: '/checks/cooldown', page: 'Cooldowns' }],
    kysely: [{ path: '/plugins/kysely', page: 'Kysely' }]
};

// an Error rejects the fetch the way a dropped connection does
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

const relatedNotice = (groups: readonly ResultGroup[]): string | undefined => {
    const related = groups.find((group) => group.label === 'Related');
    return related?.status === 'failed' ? related.notice : undefined;
};

const shown = (groups: readonly ResultGroup[]): { label: string; status: ResultGroup['status']; paths: string[] }[] =>
    groups.map((group) => ({
        label: group.label,
        status: group.status,
        paths: group.status === 'done' ? group.results.map((result) => result.path) : []
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

describe('useGuideSearch', () => {
    it('shows related results only for the question typed now', async () => {
        const { answer } = serving();
        const { result, rerender } = renderHook(({ typed }) => useGuideSearch(typed, true), {
            initialProps: { typed: 'cooldown' }
        });
        await pauseTyping();
        await answer('cooldown');
        expect(shown(result.current)).toEqual([{ label: 'Related', status: 'done', paths: ['/checks/cooldown'] }]);

        rerender({ typed: 'kysely' });
        expect(shown(result.current)).toEqual([{ label: 'Related', status: 'pending', paths: [] }]);

        await pauseTyping();
        await answer('kysely');
        expect(shown(result.current)).toEqual([{ label: 'Related', status: 'done', paths: ['/plugins/kysely'] }]);
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

    it('says why related results failed', async () => {
        const { answer } = serving();
        const { result, rerender } = renderHook(({ typed }) => useGuideSearch(typed, true), {
            initialProps: { typed: 'cooldown' }
        });
        await pauseTyping();
        await answer('cooldown', new Response(null, { status: 429, headers: { 'retry-after': '60' } }));
        expect(relatedNotice(result.current)).toBe('Too many searches. Try again in 60 seconds.');

        rerender({ typed: 'kysely' });
        await pauseTyping();
        await answer('kysely', new TypeError('Failed to fetch'));
        expect(relatedNotice(result.current)).toBe('Related results need a network connection.');
    });

    it('loads the guide sections once the dialog opens, and again on the next open after a failure', async () => {
        const { sectionLoads } = serving([new Response(null, { status: 503 }), Response.json(SECTIONS)]);
        const search = await freshSearch();
        const { result, rerender } = renderHook(({ open }) => search('cool', open), { initialProps: { open: false } });
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(sectionLoads()).toBe(0);

        rerender({ open: true });
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(matchedPaths(result.current)).toEqual([]);

        rerender({ open: false });
        rerender({ open: true });
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(matchedPaths(result.current)).toEqual(['/checks/cooldown/']);
    });
});
