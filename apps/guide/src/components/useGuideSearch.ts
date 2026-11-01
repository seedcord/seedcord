'use client';

import { GuideMatches, GuideSearch, parseQuestion, TooManySearches } from '@seedcord/docs-search';
import { useEffect, useMemo, useState } from 'react';

import { loadOnce } from '#lib/loadOnce';

import type { GuideResult } from '@seedcord/docs-search';

const TYPING_PAUSE_MS = 250;

const NO_RESULTS: GuideResult[] = [];

const search = new GuideSearch();

const loadMatches = loadOnce(() => GuideMatches.load());

type Found =
    | {
          question: string;
          results: GuideResult[];
      }
    | {
          question: string;
          notice: string;
      };

export interface ResultGroup {
    label: string;
    pending: boolean;
    results: GuideResult[];
    // shown in place of the rows when the search failed
    notice: string | undefined;
}

export interface GuideSearchState {
    groups: ResultGroup[];
    searching: boolean;
}

function noticeFor(error: unknown): string {
    if (error instanceof TooManySearches) return error.message;
    // fetch rejects with a TypeError when the request never reaches the server
    if (error instanceof TypeError) return 'Related results need a network connection.';
    return 'Related results are unavailable right now. Try again in a minute.';
}

function useMatches(open: boolean): GuideMatches | undefined {
    const [matches, setMatches] = useState<GuideMatches>();
    const loaded = matches !== undefined;
    useEffect(() => {
        if (!open || loaded) return undefined;
        let cancelled = false;
        // a failed load leaves Matches empty until the dialog opens again
        loadMatches().then(
            (sections) => {
                if (!cancelled) setMatches(sections);
            },
            () => undefined
        );
        return () => {
            cancelled = true;
        };
    }, [open, loaded]);
    return matches;
}

export function useGuideSearch(typed: string, open: boolean): GuideSearchState {
    const matches = useMatches(open);
    const [found, setFound] = useState<Found | null>(null);
    const question = parseQuestion(typed);
    const asking = question !== undefined;

    useEffect(() => {
        if (question === undefined) return undefined;

        const replaced = new AbortController();
        const timer = setTimeout(() => {
            search.search(question, replaced.signal).then(
                (results) => {
                    if (!replaced.signal.aborted) setFound({ question, results });
                },
                (error: unknown) => {
                    if (!replaced.signal.aborted) setFound({ question, notice: noticeFor(error) });
                }
            );
        }, TYPING_PAUSE_MS);
        return () => {
            replaced.abort();
            clearTimeout(timer);
        };
    }, [question]);

    const current = asking && found?.question === question ? found : null;
    const searching = asking && current === null;
    const answered = current !== null && 'results' in current ? current.results : NO_RESULTS;
    const notice = current !== null && 'notice' in current ? current.notice : undefined;
    const matched = useMemo(() => matches?.match(typed) ?? NO_RESULTS, [matches, typed]);

    const groups = useMemo(() => {
        const shown = new Set(matched.map((result) => result.path));
        return [
            { label: 'Matches', pending: false, results: matched, notice: undefined },
            {
                label: 'Related',
                pending: searching,
                results: answered.filter((result) => !shown.has(result.path)),
                notice
            }
        ].filter((group) => group.pending || group.results.length > 0 || group.notice !== undefined);
    }, [matched, answered, searching, notice]);

    return { groups, searching };
}
