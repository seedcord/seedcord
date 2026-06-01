import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS } from '@components/search/command-palette/constants';
import { useCommandPaletteSearch } from '@components/search/command-palette/useCommandPaletteSearch';

import type { CommandAction } from '@components/search/command-palette/types';

const DEBOUNCE_MS = SEARCH_DEBOUNCE_MS;

interface DeferredFetch {
    promise: Promise<Response>;
    resolve: (response: Response) => void;
    reject: (reason: unknown) => void;
    signal: AbortSignal;
}

function makeDeferred(signal: AbortSignal): DeferredFetch {
    let resolve!: (response: Response) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<Response>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject, signal };
}

function jsonResponse(body: unknown): Response {
    return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(body)
    } as unknown as Response;
}

async function flushMicrotasks(): Promise<void> {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
}

const SAMPLE: CommandAction[] = [{ id: '1', label: 'Foo', path: '/foo', href: '/foo', kind: 'page' }];

function takePending(list: DeferredFetch[], index: number): DeferredFetch {
    const entry = list[index];
    if (!entry) throw new Error(`expected a pending fetch at index ${String(index)}`);
    return entry;
}

describe('useCommandPaletteSearch', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let pending: DeferredFetch[];

    beforeEach(() => {
        vi.useFakeTimers();
        pending = [];
        fetchMock = vi.fn((_url: string, init?: RequestInit) => {
            // justified: capture the AbortSignal so abort assertions can read .aborted.
            const signal = init?.signal ?? new AbortController().signal;
            const deferred = makeDeferred(signal);
            pending.push(deferred);
            return deferred.promise;
        });
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('returns DEFAULT_STATE without fetching when query is shorter than the minimum', () => {
        const { result } = renderHook(() => useCommandPaletteSearch({ open: true, query: 'ab' }));

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS * 5);
        });

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.current).toEqual({ results: [], status: 'idle' });
    });

    it('returns DEFAULT_STATE without fetching when the palette is closed', () => {
        renderHook(() => useCommandPaletteSearch({ open: false, query: 'hello' }));

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS * 5);
        });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('debounces an active query and resolves to success with results', async () => {
        const { result } = renderHook(() => useCommandPaletteSearch({ open: true, query: 'foo' }));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.current.status).toBe('idle');

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/search?q=foo');
        expect(result.current.status).toBe('loading');

        await act(async () => {
            takePending(pending, 0).resolve(jsonResponse({ results: SAMPLE }));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current).toEqual({ results: SAMPLE, status: 'success' });
    });

    it('aborts the in-flight request when the consumer unmounts', () => {
        const { unmount } = renderHook(() => useCommandPaletteSearch({ open: true, query: 'foo' }));

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(takePending(pending, 0).signal.aborted).toBe(false);

        unmount();

        expect(takePending(pending, 0).signal.aborted).toBe(true);
    });

    it('aborts the previous request when the query changes mid-flight', async () => {
        const { rerender, result } = renderHook(
            ({ query }: { query: string }) => useCommandPaletteSearch({ open: true, query }),
            { initialProps: { query: 'foo' } }
        );

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(takePending(pending, 0).signal.aborted).toBe(false);

        rerender({ query: 'bar' });

        expect(takePending(pending, 0).signal.aborted).toBe(true);

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS);
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);

        await act(async () => {
            takePending(pending, 1).resolve(jsonResponse({ results: SAMPLE }));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current).toEqual({ results: SAMPLE, status: 'success' });
    });

    it('does not flash the loading flag for typing bursts shorter than the debounce', () => {
        const { rerender, result } = renderHook(
            ({ query }: { query: string }) => useCommandPaletteSearch({ open: true, query }),
            { initialProps: { query: 'foo' } }
        );

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS - 20);
        });
        rerender({ query: 'foob' });
        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS - 20);
        });
        rerender({ query: 'fooba' });
        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS - 20);
        });

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.current.status).toBe('idle');

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS);
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('loading');
    });

    it('reverts to DEFAULT_STATE when the query shrinks below the minimum without a stale loading flag', async () => {
        const { rerender, result } = renderHook(
            ({ query }: { query: string }) => useCommandPaletteSearch({ open: true, query }),
            { initialProps: { query: 'foo' } }
        );

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS);
        });
        await act(async () => {
            takePending(pending, 0).resolve(jsonResponse({ results: SAMPLE }));
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(result.current.status).toBe('success');

        rerender({ query: 'fo' });

        expect(result.current.status).toBe('success');

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS * 3);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('reports an error state when the server responds non-OK', async () => {
        const { result } = renderHook(() => useCommandPaletteSearch({ open: true, query: 'foo' }));

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS);
        });

        await act(async () => {
            takePending(pending, 0).resolve({
                ok: false,
                status: 500,
                json: () => Promise.resolve({})
            } as unknown as Response);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(result.current.status).toBe('error');
        expect(result.current.error).toContain('500');
    });

    it('swallows AbortError so an aborted fetch never produces an error state', async () => {
        const { unmount } = renderHook(() => useCommandPaletteSearch({ open: true, query: 'foo' }));

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS);
        });

        unmount();

        await act(async () => {
            takePending(pending, 0).reject(new DOMException('aborted', 'AbortError'));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(takePending(pending, 0).signal.aborted).toBe(true);
    });

    it('coerces a non-array results payload to an empty array', async () => {
        const { result } = renderHook(() => useCommandPaletteSearch({ open: true, query: 'foo' }));

        act(() => {
            vi.advanceTimersByTime(DEBOUNCE_MS);
        });

        await act(async () => {
            takePending(pending, 0).resolve(jsonResponse({ results: 'not-an-array' }));
            await flushMicrotasks();
        });

        expect(result.current).toEqual({ results: [], status: 'success' });
    });
});
