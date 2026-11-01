'use client';

import { GuideMatches, GuideSearch, matchTerms, parseQuestion } from '@seedcord/docs-search';
import { useEffect, useMemo, useState } from 'react';

import { loadOnce } from '#lib/loadOnce';

import type { GuideResult, MatchTerms } from '@seedcord/docs-search';

const TYPING_PAUSE_MS = 250;

const NO_RESULTS: GuideResult[] = [];
// a meaning hit can share no words with the question
const NO_TERMS: MatchTerms = { title: [], text: [] };

const search = new GuideSearch();

const loadMatches = loadOnce(() => GuideMatches.load());

type Found =
    | {
          question: string;
          results: GuideResult[];
      }
    | {
          question: string;
          failed: true;
      };

export interface ResultGroup {
    label: string;
    pending: boolean;
    results: GuideResult[];
    terms: MatchTerms;
}

export interface GuideSearchState {
    groups: ResultGroup[];
    searching: boolean;
    failed: boolean;
}

function useMatches(): GuideMatches | undefined {
    const [matches, setMatches] = useState<GuideMatches>();
    useEffect(() => {
        let cancelled = false;
        void loadMatches().then((loaded) => {
            if (!cancelled) setMatches(loaded);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return matches;
}

export function useGuideSearch(typed: string): GuideSearchState {
    const matches = useMatches();
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
                () => {
                    if (!replaced.signal.aborted) setFound({ question, failed: true });
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
    const matched = useMemo(() => matches?.match(typed) ?? NO_RESULTS, [matches, typed]);
    const terms = useMemo(() => matchTerms(typed), [typed]);

    const groups = useMemo(() => {
        const shown = new Set(matched.map((result) => result.path));
        return [
            { label: 'Matches', pending: false, results: matched, terms },
            {
                label: 'Related',
                pending: searching,
                results: answered.filter((result) => !shown.has(result.path)),
                terms: NO_TERMS
            }
        ].filter((group) => group.pending || group.results.length > 0);
    }, [matched, answered, searching, terms]);

    return { groups, searching, failed: current !== null && 'failed' in current };
}
