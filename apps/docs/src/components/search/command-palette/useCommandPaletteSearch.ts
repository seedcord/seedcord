'use client';

import { useEffect, useState } from 'react';

import { MIN_SEARCH_QUERY_LENGTH } from './constants';

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
const SEARCH_DEBOUNCE_MS = 160;

interface SearchResponse {
    results?: CommandAction[];
}

const createDefaultState = (): SearchState => ({ results: [], status: 'idle' });

export function useCommandPaletteSearch({ query, open }: UseCommandPaletteSearchOptions): SearchState {
    const [state, setState] = useState<SearchState>(createDefaultState);

    useEffect(() => {
        const trimmed = query.trim();

        if (!open || trimmed.length < MIN_SEARCH_QUERY_LENGTH) {
            const resetTimeout = window.setTimeout(() => setState(createDefaultState()), 0);
            return () => window.clearTimeout(resetTimeout);
        }

        let cancelled = false;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            setState({ results: [], status: 'loading' });

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
                    setState({
                        results: Array.isArray(payload.results) ? payload.results : [],
                        status: 'success'
                    });
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
    }, [open, query]);

    return state;
}
