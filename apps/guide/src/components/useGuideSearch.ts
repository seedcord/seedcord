'use client';

import { GuideMatches, GuideSearch, parseQuestion, TooManySearches } from '@seedcord/docs-search';
import { useEffect, useMemo, useState } from 'react';

import { loadOnce } from '#lib/loadOnce';

import type { GuideResult } from '@seedcord/docs-search';

const TYPING_PAUSE_MS = 250;

const NO_RESULTS: GuideResult[] = [];

const search = new GuideSearch();

const loadMatches = loadOnce(() => GuideMatches.load());

type GroupState =
    { status: 'pending' } | { status: 'failed'; notice: string } | { status: 'done'; results: GuideResult[] };

export type ResultGroup = { label: string } & GroupState;

interface Answer {
    question: string;
    state: Exclude<GroupState, { status: 'pending' }>;
}

const PENDING: GroupState = { status: 'pending' };
const NOT_ASKED: GroupState = { status: 'done', results: NO_RESULTS };

function noticeFor(error: unknown): string {
    if (error instanceof TooManySearches) return error.message;
    // fetch rejects with a TypeError when the request never reaches the server
    if (error instanceof TypeError) return 'Related results need a network connection.';
    return 'Related results are unavailable right now. Try again in a minute.';
}

function relatedState(question: string | undefined, answer: Answer | null): GroupState {
    if (question === undefined) return NOT_ASKED;
    return answer?.question === question ? answer.state : PENDING;
}

function withoutShown(state: GroupState, shown: ReadonlySet<string>): GroupState {
    if (state.status !== 'done') return state;
    return { status: 'done', results: state.results.filter((result) => !shown.has(result.path)) };
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

export function useGuideSearch(typed: string, open: boolean): ResultGroup[] {
    const matches = useMatches(open);
    const [answer, setAnswer] = useState<Answer | null>(null);
    const question = parseQuestion(typed);

    useEffect(() => {
        if (question === undefined) return undefined;

        const replaced = new AbortController();
        const timer = setTimeout(() => {
            search.search(question, replaced.signal).then(
                (results) => {
                    if (!replaced.signal.aborted) setAnswer({ question, state: { status: 'done', results } });
                },
                (error: unknown) => {
                    if (replaced.signal.aborted) return;
                    setAnswer({ question, state: { status: 'failed', notice: noticeFor(error) } });
                }
            );
        }, TYPING_PAUSE_MS);
        return () => {
            replaced.abort();
            clearTimeout(timer);
        };
    }, [question]);

    const related = relatedState(question, answer);
    const matched = useMemo(() => matches?.match(typed) ?? NO_RESULTS, [matches, typed]);

    return useMemo(() => {
        const shown = new Set(matched.map((result) => result.path));
        const groups: ResultGroup[] = [
            { label: 'Matches', status: 'done', results: matched },
            { label: 'Related', ...withoutShown(related, shown) }
        ];
        return groups.filter((group) => group.status !== 'done' || group.results.length > 0);
    }, [matched, related]);
}
