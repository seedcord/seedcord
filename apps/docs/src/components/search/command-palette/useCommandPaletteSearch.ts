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
    // Re-opening with a previously-resolved query must skip the fetch, otherwise the UI flickers cached -> loading -> cached.
    const cacheRef = useRef<Map<string, CommandAction[]>>(new Map());
    const trimmed = query.trim();
    const active = open && trimmed.length >= MIN_SEARCH_QUERY_LENGTH;
    const { pkg, version } = parseActiveDocsTarget(usePathname());

    useEffect(() => {
        if (!active) return undefined;

        let cancelled = false;
        const controller = new AbortController();
        // Key the cache to every input that changes the result set (current package/version + the scope,
        // kind, and prerelease filters) so one combination never returns another's results.
        const cacheKey = `${pkg}::${version}::${scope}::${kind}::${prerelease ? '1' : '0'}::${trimmed}`;
        // Cache check sits inside the debounce so both paths (hit and fresh fetch) wait the same
        // window; checking before would flash intermediate cached results between keystrokes.
        const timeout = window.setTimeout(() => {
            const cached = cacheRef.current.get(cacheKey);
            if (cached) {
                setState({ results: cached, status: 'success' });
                return;
            }

            // Keep the previous results visible while the next query resolves; the header spinner signals the
            // refresh. Clearing here is what made the list flicker to the caption between keystrokes.
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
                    cacheRef.current.set(cacheKey, results);
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

    // Returning `state` while `!active` preserves results during the close animation so Esc doesn't flash the empty caption mid-collapse.
    return state;
}
