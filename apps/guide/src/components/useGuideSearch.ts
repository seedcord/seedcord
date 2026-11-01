'use client';

import { GuideSearch, GuideTitles, parseQuestion } from '@seedcord/docs-search';
import { useEffect, useMemo, useState } from 'react';

import { loadOnce } from '#lib/loadOnce';

import type { GuideResult } from '@seedcord/docs-search';

const TYPING_PAUSE_MS = 250;

const NO_RESULTS: GuideResult[] = [];

const search = new GuideSearch();

const loadTitles = loadOnce(() => GuideTitles.load());

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
}

export interface GuideSearchState {
    groups: ResultGroup[];
    searching: boolean;
    failed: boolean;
}

function useTitles(): GuideTitles | undefined {
    const [titles, setTitles] = useState<GuideTitles>();
    useEffect(() => {
        let cancelled = false;
        void loadTitles().then((loaded) => {
            if (!cancelled) setTitles(loaded);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return titles;
}

export function useGuideSearch(typed: string): GuideSearchState {
    const titles = useTitles();
    const [found, setFound] = useState<Found | null>(null);
    const question = parseQuestion(typed);
    const asking = question !== undefined;

    useEffect(() => {
        if (question === undefined) return undefined;

        let cancelled = false;
        const timer = setTimeout(() => {
            search.search(question).then(
                (results) => {
                    if (!cancelled) setFound({ question, results });
                },
                () => {
                    if (!cancelled) setFound({ question, failed: true });
                }
            );
        }, TYPING_PAUSE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [question]);

    const current = asking && found?.question === question ? found : null;
    const searching = asking && current === null;
    const answered = current !== null && 'results' in current ? current.results : NO_RESULTS;
    const matched = useMemo(() => titles?.match(typed) ?? NO_RESULTS, [titles, typed]);

    const groups = useMemo(() => {
        const shown = new Set(matched.map((result) => result.path));
        return [
            { label: 'Pages and headings', pending: false, results: matched },
            { label: 'Related', pending: searching, results: answered.filter((result) => !shown.has(result.path)) }
        ].filter((group) => group.pending || group.results.length > 0);
    }, [matched, answered, searching]);

    return { groups, searching, failed: current !== null && 'failed' in current };
}
