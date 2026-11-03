'use client';

import {
    GuideMatches,
    GuideSearch,
    loadOnce,
    parseQuestion,
    SearchUnavailable,
    SiteUnreachable
} from '@seedcord/docs-search';
import { GUIDE } from '@seedcord/ui/sites';
import { useEffect, useMemo, useState } from 'react';

import { ERROR_CODES } from '#lib/errorCodes';

import type { CodeMentions, GuideResult } from '@seedcord/docs-search';
import type { TaggedUnion } from 'type-fest';

const TYPING_PAUSE_MS = 250;

const NO_RESULTS: GuideResult[] = [];
const NO_CODES: CodeMentions = { swapped: [], hints: [] };

const search = new GuideSearch(GUIDE);

const loadMatches = loadOnce(() => GuideMatches.load(GUIDE));

type States = {
    pending: Record<never, never>;
    failed: { notice: string };
    done: { results: GuideResult[] };
};

type State<Name extends keyof States> = TaggedUnion<'status', Pick<States, Name>>;

type GroupState = State<keyof States>;

export type ResultGroup = { label: string } & GroupState;

type Loaded = TaggedUnion<'status', Pick<States, 'pending' | 'failed'> & { ready: { matches: GuideMatches } }>;

interface Answer {
    question: string;
    state: State<'failed' | 'done'>;
}

interface GuideSearchState {
    groups: ResultGroup[];
    codes: CodeMentions;
}

const PENDING = { status: 'pending' } as const;
const NOT_ASKED: State<'done'> = { status: 'done', results: NO_RESULTS };
const NO_ANSWER: Answer = { question: '', state: NOT_ASKED };

function noticeFor(error: unknown, results: string): string {
    if (error instanceof SearchUnavailable) return error.message;
    if (error instanceof SiteUnreachable) return `${results} can't load without a network connection.`;
    return `${results} are unavailable right now. Close and reopen search to try again.`;
}

function matchesState(typed: string, loaded: Loaded): GroupState {
    if (typed.trim() === '') return NOT_ASKED;
    return loaded.status === 'ready' ? { status: 'done', results: loaded.matches.match(typed) } : loaded;
}

function relatedState(question: string | undefined, latest: Answer): GroupState {
    if (question === undefined) return NOT_ASKED;
    return latest.question === question ? latest.state : PENDING;
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

export function useGuideSearch(typed: string, open: boolean): GuideSearchState {
    const loaded = useMatches(open);
    const [latest, setLatest] = useState(NO_ANSWER);
    const question = parseQuestion(typed);
    const answered = latest.state.status === 'done' && latest.question === question;

    useEffect(() => {
        if (question === undefined || !open || answered) return undefined;

        const replaced = new AbortController();
        const timer = setTimeout(() => {
            search.search(question, replaced.signal).then(
                (results) => {
                    if (replaced.signal.aborted) return;
                    setLatest({ question, state: { status: 'done', results } });
                },
                (error: unknown) => {
                    if (replaced.signal.aborted) return;
                    setLatest({ question, state: { status: 'failed', notice: noticeFor(error, 'Related results') } });
                }
            );
        }, TYPING_PAUSE_MS);
        return () => {
            replaced.abort();
            clearTimeout(timer);
        };
    }, [question, open, answered]);

    const related = relatedState(question, latest);
    const matched = useMemo(() => matchesState(typed, loaded), [typed, loaded]);

    const groups = useMemo(() => {
        const shown = new Set(matched.status === 'done' ? matched.results.map((result) => result.path) : []);
        const all: ResultGroup[] = [
            { label: 'Matches', ...matched },
            { label: 'Related', ...withoutShown(related, shown) }
        ];
        return all.filter((group) => group.status !== 'done' || group.results.length > 0);
    }, [matched, related]);

    return { groups, codes: question === undefined ? NO_CODES : ERROR_CODES.read(question) };
}
