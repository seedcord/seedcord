'use client';

import { GuideSearch, parseQuestion } from '@seedcord/docs-search';
import { useEffect, useState } from 'react';

import type { GuideResult } from '@seedcord/docs-search';

const TYPING_PAUSE_MS = 250;

const NO_RESULTS: GuideResult[] = [];

const search = new GuideSearch();

type Found =
    | {
          question: string;
          results: GuideResult[];
      }
    | {
          question: string;
          failed: true;
      };

export interface GuideSearchState {
    asking: boolean;
    results: GuideResult[];
    searching: boolean;
    failed: boolean;
}

export function useGuideSearch(typed: string): GuideSearchState {
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
    return {
        asking,
        // found over current keeps the last answer up while the next one loads
        // useRovingList keys an effect on this array's identity
        results: asking && found && 'results' in found ? found.results : NO_RESULTS,
        searching: asking && current === null,
        failed: current !== null && 'failed' in current
    };
}
