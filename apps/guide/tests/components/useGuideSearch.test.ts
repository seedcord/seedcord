import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuideSearch } from '#components/useGuideSearch';

import type { ResultGroup } from '#components/useGuideSearch';

const TYPING_PAUSE_MS = 250;

const ANSWERS: Record<string, { path: string; page: string }[]> = {
    cooldown: [{ path: '/checks/cooldown', page: 'Cooldowns' }],
    kysely: [{ path: '/plugins/kysely', page: 'Kysely' }]
};

interface Server {
    answer(question: string): Promise<void>;
    signals: Map<string, AbortSignal | undefined>;
}

// sections.json answers right away. each question waits until the test answers it
function serving(): Server {
    const pending = new Map<string, () => void>();
    const signals = new Map<string, AbortSignal | undefined>();
    vi.stubGlobal('fetch', (input: string | URL, init?: RequestInit) => {
        const url = new URL(input, 'https://seedcord.org');
        if (url.pathname.endsWith('/sections.json')) return Promise.resolve(Response.json([]));
        const question = url.searchParams.get('q') ?? '';
        signals.set(question, init?.signal ?? undefined);
        return new Promise<Response>((resolve) => {
            pending.set(question, () => resolve(Response.json(ANSWERS[question] ?? [])));
        });
    });
    return {
        signals,
        answer: async (question) => {
            await act(() => {
                pending.get(question)?.();
                return vi.advanceTimersByTimeAsync(0);
            });
        }
    };
}

const shown = (groups: readonly ResultGroup[]): { label: string; pending: boolean; paths: string[] }[] =>
    groups.map(({ label, pending, results }) => ({ label, pending, paths: results.map((result) => result.path) }));

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
        const { result, rerender } = renderHook(({ typed }) => useGuideSearch(typed), {
            initialProps: { typed: 'cooldown' }
        });
        await pauseTyping();
        await answer('cooldown');
        expect(shown(result.current.groups)).toEqual([
            { label: 'Related', pending: false, paths: ['/checks/cooldown'] }
        ]);

        rerender({ typed: 'kysely' });
        expect(shown(result.current.groups)).toEqual([{ label: 'Related', pending: true, paths: [] }]);

        await pauseTyping();
        await answer('kysely');
        expect(shown(result.current.groups)).toEqual([
            { label: 'Related', pending: false, paths: ['/plugins/kysely'] }
        ]);
    });

    it('cancels the request for a question the reader typed past', async () => {
        const { signals } = serving();
        const { rerender } = renderHook(({ typed }) => useGuideSearch(typed), { initialProps: { typed: 'cooldown' } });
        await pauseTyping();

        rerender({ typed: 'kysely' });

        expect(signals.get('cooldown')?.aborted).toBe(true);
    });
});
