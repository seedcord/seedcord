'use client';

import { GuideMatches, GuideSearch, loadOnce, parseQuestion, TooManySearches } from '@seedcord/docs-search';
import { useEffect, useMemo, useState } from 'react';

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

type Loaded = TaggedUnion<'status', Pick<States, 'pending' | 'failed'> & { ready: { matches: GuideMatches } }>;

interface Settled<Value extends { status: string }> {
    duringOpen: number;
    state: Value;
}

interface Answer extends Settled<State<'failed' | 'done'>> {
    question: string;
}

// a reopened dialog retries whatever failed during an earlier open
const failedBefore = (settled: Settled<{ status: string }>, opens: number): boolean =>
    settled.state.status === 'failed' && settled.duringOpen !== opens;

const PENDING = { status: 'pending' } as const;
const NOT_ASKED: GroupState = { status: 'done', results: NO_RESULTS };

function noticeFor(error: unknown, results: string): string {
    if (error instanceof TooManySearches) return error.message;
    // fetch rejects with a TypeError when the request never reaches the server
    if (error instanceof TypeError) return `${results} can't load without a network connection.`;
    return `${results} are unavailable right now. Close and reopen search to try again.`;
}

function matchesState(typed: string, loaded: Loaded): GroupState {
    if (typed.trim() === '') return NOT_ASKED;
    return loaded.status === 'ready' ? { status: 'done', results: loaded.matches.match(typed) } : loaded;
}

function relatedState(question: string | undefined, answer: Answer | null, opens: number): GroupState {
    if (question === undefined) return NOT_ASKED;
    return answer?.question === question && !failedBefore(answer, opens) ? answer.state : PENDING;
}

function withoutShown(state: GroupState, shown: ReadonlySet<string>): GroupState {
    if (state.status !== 'done') return state;
    return { status: 'done', results: state.results.filter((result) => !shown.has(result.path)) };
}

export function emptyMessage(typed: string, groups: readonly ResultGroup[]): string | undefined {
    const query = typed.trim();
    if (query === '') return 'Ask anything about seedcord, or type a term.';
    return groups.length === 0 ? `No matches for “${query}”.` : undefined;
}

function useOpens(open: boolean): number {
    const [seen, setSeen] = useState({ open, opens: 0 });
    if (seen.open !== open) setSeen({ open, opens: open ? seen.opens + 1 : seen.opens });
    return seen.opens;
}

function useMatches(open: boolean, opens: number): Loaded {
    const [loaded, setLoaded] = useState<Settled<Loaded>>({ duringOpen: opens, state: PENDING });
    const ready = loaded.state.status === 'ready';
    useEffect(() => {
        if (!open || ready) return undefined;
        let cancelled = false;
        loadMatches().then(
            (matches) => {
                if (!cancelled) setLoaded({ duringOpen: opens, state: { status: 'ready', matches } });
            },
            (error: unknown) => {
                if (cancelled) return;
                setLoaded({ duringOpen: opens, state: { status: 'failed', notice: noticeFor(error, 'Matches') } });
            }
        );
        return () => {
            cancelled = true;
        };
    }, [open, opens, ready]);
    return failedBefore(loaded, opens) ? PENDING : loaded.state;
}

export function useGuideSearch(typed: string, open: boolean): ResultGroup[] {
    const opens = useOpens(open);
    const loaded = useMatches(open, opens);
    const [answer, setAnswer] = useState<Answer | null>(null);
    const question = parseQuestion(typed);

    useEffect(() => {
        if (question === undefined || !open) return undefined;

        const replaced = new AbortController();
        const timer = setTimeout(() => {
            search.search(question, replaced.signal).then(
                (results) => {
                    if (replaced.signal.aborted) return;
                    setAnswer({ question, duringOpen: opens, state: { status: 'done', results } });
                },
                (error: unknown) => {
                    if (replaced.signal.aborted) return;
                    const state = { status: 'failed', notice: noticeFor(error, 'Related results') } as const;
                    setAnswer({ question, duringOpen: opens, state });
                }
            );
        }, TYPING_PAUSE_MS);
        return () => {
            replaced.abort();
            clearTimeout(timer);
        };
    }, [question, open, opens]);

    const related = relatedState(question, answer, opens);
    const matched = useMemo(() => matchesState(typed, loaded), [typed, loaded]);

    return useMemo(() => {
        const shown = new Set(matched.status === 'done' ? matched.results.map((result) => result.path) : []);
        const groups: ResultGroup[] = [
            { label: 'Matches', ...matched },
            { label: 'Related', ...withoutShown(related, shown) }
        ];
        return groups.filter((group) => group.status !== 'done' || group.results.length > 0);
    }, [matched, related]);
}
