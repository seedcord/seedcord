'use client';

import { useEffect, useRef, useState } from 'react';

import { MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from './constants';

import type { CommandAction } from './types';

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

interface SearchState {
    results: CommandAction[];
    status: SearchStatus;
    error?: string;
}

interface UseCommandPaletteSearchOptions {
    open: boolean;
    query: string;
}

const SEARCH_ENDPOINT = '/docs/search';

interface SearchResponse {
    results?: CommandAction[];
}

const DEFAULT_STATE: SearchState = { results: [], status: 'idle' };

export function useCommandPaletteSearch({ query, open }: UseCommandPaletteSearchOptions): SearchState {
    const [state, setState] = useState<SearchState>(DEFAULT_STATE);
    // Re-opening with a previously-resolved query must skip the fetch, otherwise the UI flickers cached -> loading -> cached.
    const cacheRef = useRef<Map<string, CommandAction[]>>(new Map());
    const trimmed = query.trim();
    const active = open && trimmed.length >= MIN_SEARCH_QUERY_LENGTH;

    useEffect(() => {
        if (!active) return undefined;

        let cancelled = false;
        const controller = new AbortController();
        // justified: every input path (cache hit and fresh fetch) waits the same debounce window so
        // fast typing does not flash intermediate cached results between keystrokes.
        const timeout = window.setTimeout(() => {
            const cached = cacheRef.current.get(trimmed);
            if (cached) {
                setState({ results: cached, status: 'success' });
                return;
            }

            // Keep the previous results visible while the next query resolves; the header spinner signals the
            // refresh. Clearing to [] here is what made the list flicker to the caption between keystrokes.
            setState((prev) => ({ results: prev.results, status: 'loading' }));

            const params = new URLSearchParams({ q: trimmed });

            fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, { signal: controller.signal })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Search failed with status ${response.status}`);
                    }
                    return response.json() as Promise<SearchResponse>;
                })
                .then((payload) => {
                    if (cancelled) {
                        return;
                    }
                    const results = Array.isArray(payload.results) ? payload.results : [];
                    cacheRef.current.set(trimmed, results);
                    setState({ results, status: 'success' });
                })
                .catch((error: unknown) => {
                    if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) {
                        return;
                    }

                    setState({
                        results: [],
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknown search error'
                    });
                });
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            controller.abort();
            window.clearTimeout(timeout);
        };
    }, [active, trimmed]);

    // Returning `state` while `!active` preserves results during the close animation so Esc doesn't flash the empty caption mid-collapse.
    return state;
}
