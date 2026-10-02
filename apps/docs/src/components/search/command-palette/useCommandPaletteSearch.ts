'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { searchFiles } from '#lib/search/SearchFiles';

import { parseActiveDocsTarget } from './activeTarget';
import { MIN_SEARCH_QUERY_LENGTH } from './constants';

import type { CommandAction } from './types';
import type { SearchResults } from '#lib/search/SearchResults';

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

type Loaded = { key: string; results: SearchResults } | { key: string; error: string };

const DEFAULT_STATE: SearchState = { results: [], status: 'idle' };

export function useCommandPaletteSearch({
    query,
    open,
    scope,
    kind,
    prerelease
}: UseCommandPaletteSearchOptions): SearchState {
    const { pkg, version } = parseActiveDocsTarget(usePathname());
    const key = `${pkg}::${version}::${scope}::${prerelease ? '1' : '0'}`;
    const [lastLoaded, setLastLoaded] = useState<Loaded | null>(null);
    const hasCurrentResults = lastLoaded?.key === key && 'results' in lastLoaded;
    const trimmed = query.trim();

    useEffect(() => {
        if (!open || hasCurrentResults) return undefined;

        let cancelled = false;
        searchFiles.results({ pkg, version }, scope, prerelease).then(
            (results) => {
                if (!cancelled) setLastLoaded({ key, results });
            },
            (error: unknown) => {
                if (cancelled) return;
                setLastLoaded({ key, error: error instanceof Error ? error.message : 'Unknown search error' });
            }
        );
        return () => {
            cancelled = true;
        };
    }, [open, hasCurrentResults, key, pkg, version, scope, prerelease]);

    const ranked = useMemo(
        () =>
            lastLoaded && 'results' in lastLoaded && trimmed.length >= MIN_SEARCH_QUERY_LENGTH
                ? lastLoaded.results.rank(trimmed, kind)
                : [],
        [lastLoaded, trimmed, kind]
    );

    if (trimmed.length < MIN_SEARCH_QUERY_LENGTH) return DEFAULT_STATE;
    if (lastLoaded?.key === key && 'error' in lastLoaded) {
        return { results: [], status: 'error', error: lastLoaded.error };
    }
    return { results: ranked, status: hasCurrentResults ? 'success' : 'loading' };
}
