'use client';

import {
    SearchDialog,
    SearchField,
    SearchTrigger,
    cn,
    useActiveRowScroll,
    useRovingList,
    useSearchHotkey
} from '@seedcord/ui';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';

import { firstPages } from '#lib/searchHighlight';
import { stripStopwords } from '#lib/searchQuery';
import { rankByCoverage } from '#lib/searchRank';

import { SearchResultRow } from './SearchResultRow';

import type { SortedResult } from 'fumadocs-core/search';
import type { ReactElement } from 'react';

const LISTBOX_ID = 'guide-search-results';

export const SEARCH_LABEL = 'Search the guide';

const NO_RESULTS: SortedResult[] = [];

// a common term matches most of the guide. the ranking already puts the right page on top
const MAX_PAGES = 16;

function optionId(id: string): string {
    return `guide-search-${id}`;
}

function Results({
    results,
    activeIndex,
    isFirst,
    isLast,
    onSelect,
    onActivate,
    emptyMessage
}: {
    results: SortedResult[];
    activeIndex: number;
    isFirst: boolean;
    isLast: boolean;
    onSelect: (result: SortedResult) => void;
    onActivate: (index: number) => void;
    emptyMessage: string | null;
}): ReactElement | null {
    const active = results[activeIndex];
    useActiveRowScroll(active ? optionId(active.id) : undefined, isFirst, isLast);

    // a null child collapses the animated panel back to the bare bar
    if (emptyMessage === null && results.length === 0) return null;

    return (
        <div className={cn('py-3')}>
            {emptyMessage === null ? null : (
                <div className={cn('text-subtle px-3 py-8 text-center text-sm')}>{emptyMessage}</div>
            )}
            {results.length > 0 ? (
                <div id={LISTBOX_ID} role="listbox" aria-label="Search results">
                    {results.map((result, index) => (
                        <SearchResultRow
                            key={result.id}
                            result={result}
                            isActive={index === activeIndex}
                            optionId={optionId(result.id)}
                            index={index}
                            onSelect={onSelect}
                            onActivate={onActivate}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export interface GuideSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GuideSearch({ open, onOpenChange: setOpen }: GuideSearchProps): ReactElement {
    const [typed, setTyped] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // tolerance is the edit distance zbsearch allows. 1 covers a single typo
    const client = useMemo(() => staticClient({ search: { tolerance: 1 } }), []);
    const { setSearch, query } = useDocsSearch({ client });

    // the box keeps what the reader typed. the index gets the words that narrow the search
    const onValueChange = useCallback(
        (value: string) => {
            setTyped(value);
            setSearch(stripStopwords(value));
        },
        [setSearch]
    );

    useSearchHotkey(() => setOpen(!open));

    const found = query.data === 'empty' || query.data === undefined ? NO_RESULTS : query.data;
    // ranking first leaves the cap holding whichever pages cover the most of the query
    // useRovingList keys an effect on this array's identity
    const results = useMemo(() => firstPages(rankByCoverage(found, stripStopwords(typed)), MAX_PAGES), [found, typed]);

    const select = useCallback(
        (result: SortedResult) => {
            setOpen(false);
            router.push(result.url);
        },
        [router, setOpen]
    );

    const { activeIndex, isFirst, isLast, setActiveIndex, onKeyDown } = useRovingList({
        items: results,
        onSelect: select
    });

    const asked = typed.trim().length > 0;
    let emptyMessage: string | null = null;
    if (!asked) emptyMessage = 'Type to search every page in the guide.';
    else if (!query.isLoading && results.length === 0) emptyMessage = `Nothing on any page matches "${typed.trim()}".`;

    const active = results[activeIndex];

    return (
        <>
            <SearchTrigger label={SEARCH_LABEL} onOpen={() => setOpen(true)} />
            <SearchDialog
                open={open}
                onOpenChange={setOpen}
                onClose={() => setOpen(false)}
                title="Search"
                description="Search every page in the seedcord guide."
                field={
                    <SearchField
                        inputRef={inputRef}
                        value={typed}
                        onValueChange={onValueChange}
                        onKeyDown={onKeyDown}
                        onClose={() => setOpen(false)}
                        label={SEARCH_LABEL}
                        closeLabel="Close search"
                        placeholder="Search the guide"
                        listboxId={LISTBOX_ID}
                        listExpanded={results.length > 0}
                        isSearching={query.isLoading}
                        {...(active ? { activeId: optionId(active.id) } : {})}
                    />
                }
            >
                <Results
                    results={results}
                    activeIndex={activeIndex}
                    isFirst={isFirst}
                    isLast={isLast}
                    onSelect={select}
                    onActivate={setActiveIndex}
                    emptyMessage={emptyMessage}
                />
            </SearchDialog>
        </>
    );
}
