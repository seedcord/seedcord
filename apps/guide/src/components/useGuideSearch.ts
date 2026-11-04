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
    pending: { results: GuideResult[] };
    failed: { notice: string };
    done: { results: GuideResult[] };
};

type State<Name extends keyof States> = TaggedUnion<'status', Pick<States, Name>>;

type GroupState = State<keyof States>;

export type ResultGroup = { label: string } & GroupState;

type Loaded = TaggedUnion<'status', Pick<States, 'pending' | 'failed'> & { ready: { matches: GuideMatches } }>;

type Answer = State<'failed' | 'done'>;

interface GuideSearchState {
    groups: ResultGroup[];
    codes: CodeMentions;
}

const PENDING: State<'pending'> = { status: 'pending', results: NO_RESULTS };
const NOT_ASKED: State<'done'> = { status: 'done', results: NO_RESULTS };
const NO_ANSWERS: ReadonlyMap<string, Answer> = new Map();

function noticeFor(error: unknown, results: string): string {
    if (error instanceof SearchUnavailable) return error.message;
    if (error instanceof SiteUnreachable) return `${results} can't load without a network connection.`;
    return `${results} are unavailable right now. Close and reopen search to try again.`;
}

function matchesState(typed: string, loaded: Loaded): GroupState {
    if (typed.trim() === '') return NOT_ASKED;
    return loaded.status === 'ready' ? { status: 'done', results: loaded.matches.match(typed) } : loaded;
}

function relatedRows(state: GroupState, shown: ReadonlySet<string>, loaded: Loaded): GroupState {
    if (state.status === 'failed') return state;
    const results = state.results.filter((result) => !shown.has(result.path));
    return { ...state, results: loaded.status === 'ready' ? loaded.matches.withOpenings(results) : results };
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
    const [answers, setAnswers] = useState(NO_ANSWERS);
    const [lastRows, setLastRows] = useState(NO_RESULTS);
    const question = parseQuestion(typed);
    const answer = question === undefined ? NOT_ASKED : answers.get(question);
    const answered = answer?.status === 'done';

    if (answered && answer.results !== lastRows) setLastRows(answer.results);

    useEffect(() => {
        if (question === undefined || !open || answered) return undefined;

        const replaced = new AbortController();
        const remember = (state: Answer): void => {
            if (!replaced.signal.aborted) setAnswers((known) => new Map(known).set(question, state));
        };
        const timer = setTimeout(() => {
            search.search(question, replaced.signal).then(
                (results) => remember({ status: 'done', results }),
                (error: unknown) => remember({ status: 'failed', notice: noticeFor(error, 'Related results') })
            );
        }, TYPING_PAUSE_MS);
        return () => {
            replaced.abort();
            clearTimeout(timer);
        };
    }, [question, open, answered]);

    const matched = useMemo(() => matchesState(typed, loaded), [typed, loaded]);

    const groups = useMemo(() => {
        const shown = new Set(matched.status === 'done' ? matched.results.map((result) => result.path) : []);
        const related = answer ?? { status: 'pending', results: lastRows };
        const all: ResultGroup[] = [
            { label: 'Matches', ...matched },
            { label: 'Related', ...relatedRows(related, shown, loaded) }
        ];
        return all.filter((group) => group.status !== 'done' || group.results.length > 0);
    }, [matched, answer, lastRows, loaded]);

    return { groups, codes: question === undefined ? NO_CODES : ERROR_CODES.read(question) };
}
