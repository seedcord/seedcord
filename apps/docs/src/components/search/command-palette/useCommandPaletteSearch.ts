'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { parseActiveDocsTarget } from './activeTarget';
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
    scope: string;
    kind: string;
    prerelease: boolean;
}

const SEARCH_ENDPOINT = '/search';

interface SearchResponse {
    results?: CommandAction[];
}

const DEFAULT_STATE: SearchState = { results: [], status: 'idle' };

export function useCommandPaletteSearch({
    query,
    open,
    scope,
    kind,
    prerelease
}: UseCommandPaletteSearchOptions): SearchState {
    const [state, setState] = useState<SearchState>(DEFAULT_STATE);
    const cacheRef = useRef<Map<string, CommandAction[]> | null>(null);
    const trimmed = query.trim();
    const active = open && trimmed.length >= MIN_SEARCH_QUERY_LENGTH;
    const { pkg, version } = parseActiveDocsTarget(usePathname());

    useEffect(() => {
        if (!active) return undefined;

        if (cacheRef.current === null) cacheRef.current = new Map();
        const cache = cacheRef.current;
        let cancelled = false;
        const controller = new AbortController();
        const cacheKey = `${pkg}::${version}::${scope}::${kind}::${prerelease ? '1' : '0'}::${trimmed}`;
        // a cache hit waits out the debounce too, else old queries flash by as you type
        const timeout = window.setTimeout(() => {
            const cached = cache.get(cacheKey);
            if (cached) {
                setState({ results: cached, status: 'success' });
                return;
            }

            // carrying prev.results is what stops the list blanking mid-refresh
            setState((prev) => ({ results: prev.results, status: 'loading' }));

            const params = new URLSearchParams({
                q: trimmed,
                pkg,
                version,
                scope,
                kind,
                prerelease: prerelease ? '1' : '0'
            });

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
                    cache.set(cacheKey, results);
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
    }, [active, trimmed, pkg, version, scope, kind, prerelease]);

    // results ride out the close animation
    return state;
}
