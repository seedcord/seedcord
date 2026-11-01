import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuideSearch } from '#components/useGuideSearch';

const TYPING_PAUSE_MS = 250;

const ANSWERS: Record<string, { path: string; page: string }[]> = {
    cooldown: [{ path: '/checks/cooldown', page: 'Cooldowns' }],
    kysely: [{ path: '/plugins/kysely', page: 'Kysely' }]
};

// titles.json answers right away. each question waits until the test answers it
function serving(): (question: string) => Promise<void> {
    const pending = new Map<string, () => void>();
    vi.stubGlobal('fetch', (input: string | URL) => {
        const url = new URL(input, 'https://seedcord.org');
        if (url.pathname.endsWith('/titles.json')) return Promise.resolve(Response.json([]));
        const question = url.searchParams.get('q') ?? '';
        return new Promise<Response>((resolve) => {
            pending.set(question, () => resolve(Response.json(ANSWERS[question] ?? [])));
        });
    });
    return async (question) => {
        await act(() => {
            pending.get(question)?.();
            return vi.advanceTimersByTimeAsync(0);
        });
    };
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
        const answer = serving();
        const { result, rerender } = renderHook(({ typed }) => useGuideSearch(typed), {
            initialProps: { typed: 'cooldown' }
        });
        await pauseTyping();
        await answer('cooldown');
        expect(result.current.groups).toEqual([
            { label: 'Related', pending: false, results: [expect.objectContaining({ path: '/checks/cooldown' })] }
        ]);

        rerender({ typed: 'kysely' });
        expect(result.current.groups).toEqual([{ label: 'Related', pending: true, results: [] }]);

        await pauseTyping();
        await answer('kysely');
        expect(result.current.groups).toEqual([
            { label: 'Related', pending: false, results: [expect.objectContaining({ path: '/plugins/kysely' })] }
        ]);
    });
});
