'use client';

import { GuideMatches, GuideSearch, parseQuestion, TooManySearches } from '@seedcord/docs-search';
import { useEffect, useMemo, useState } from 'react';

import { loadOnce } from '#lib/loadOnce';

import type { GuideResult } from '@seedcord/docs-search';
import type { TaggedUnion } from 'type-fest';

const TYPING_PAUSE_MS = 250;

const NO_RESULTS: GuideResult[] = [];

const search = new GuideSearch();

const loadMatches = loadOnce(() => GuideMatches.load());

type States = {
    pending: Record<never, never>;
    failed: { notice: string };
    done: { results: GuideResult[] };
};

type State<Name extends keyof States> = TaggedUnion<'status', Pick<States, Name>>;

type GroupState = State<keyof States>;

export type ResultGroup = { label: string } & GroupState;

interface Answer {
    question: string;
    state: State<'failed' | 'done'>;
}

type Loaded = State<'pending' | 'failed'> | { status: 'ready'; matches: GuideMatches };

const PENDING = { status: 'pending' } as const;
const NOT_ASKED: GroupState = { status: 'done', results: NO_RESULTS };

function noticeFor(error: unknown, results: string): string {
    if (error instanceof TooManySearches) return error.message;
    // fetch rejects with a TypeError when the request never reaches the server
    if (error instanceof TypeError) return `${results} need a network connection.`;
    return `${results} are unavailable right now. Try again in a minute.`;
}

function matchesState(typed: string, loaded: Loaded): GroupState {
    if (typed.trim() === '') return NOT_ASKED;
    return loaded.status === 'ready' ? { status: 'done', results: loaded.matches.match(typed) } : loaded;
}

function relatedState(question: string | undefined, answer: Answer | null): GroupState {
    if (question === undefined) return NOT_ASKED;
    return answer?.question === question ? answer.state : PENDING;
}

function withoutShown(state: GroupState, shown: ReadonlySet<string>): GroupState {
    if (state.status !== 'done') return state;
    return { status: 'done', results: state.results.filter((result) => !shown.has(result.path)) };
}

function useMatches(open: boolean): Loaded {
    const [loaded, setLoaded] = useState<Loaded>(PENDING);
    const ready = loaded.status === 'ready';
    useEffect(() => {
        if (!open || ready) return undefined;
        let cancelled = false;
        loadMatches().then(
            (matches) => {
                if (!cancelled) setLoaded({ status: 'ready', matches });
            },
            (error: unknown) => {
                if (!cancelled) setLoaded({ status: 'failed', notice: noticeFor(error, 'Matches') });
            }
        );
        return () => {
            cancelled = true;
        };
    }, [open, ready]);
    return loaded;
}

export function useGuideSearch(typed: string, open: boolean): ResultGroup[] {
    const loaded = useMatches(open);
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
                    setAnswer({ question, state: { status: 'failed', notice: noticeFor(error, 'Related results') } });
                }
            );
        }, TYPING_PAUSE_MS);
        return () => {
            replaced.abort();
            clearTimeout(timer);
        };
    }, [question]);

    const related = relatedState(question, answer);

    return useMemo(() => {
        const matched = matchesState(typed, loaded);
        const shown = new Set(matched.status === 'done' ? matched.results.map((result) => result.path) : []);
        const groups: ResultGroup[] = [
            { label: 'Matches', ...matched },
            { label: 'Related', ...withoutShown(related, shown) }
        ];
        return groups.filter((group) => group.status !== 'done' || group.results.length > 0);
    }, [typed, loaded, related]);
}
