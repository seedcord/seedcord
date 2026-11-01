'use client';

import { QUESTION_LENGTH } from '@seedcord/docs-search';
import {
    SearchDialog,
    SearchField,
    SearchTrigger,
    cn,
    useActiveRowScroll,
    useRovingList,
    useSearchHotkey
} from '@seedcord/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import { SearchResultRow } from './SearchResultRow';
import { useGuideSearch } from './useGuideSearch';

import type { GuideResult } from '@seedcord/docs-search';
import type { ReactElement } from 'react';

const LISTBOX_ID = 'guide-search-results';

export const SEARCH_LABEL = 'Search the guide';

function optionId(path: string): string {
    return `guide-search-${path}`;
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
    results: GuideResult[];
    activeIndex: number;
    isFirst: boolean;
    isLast: boolean;
    onSelect: (result: GuideResult) => void;
    onActivate: (index: number) => void;
    emptyMessage: string | null;
}): ReactElement | null {
    const active = results[activeIndex];
    useActiveRowScroll(active ? optionId(active.path) : undefined, isFirst, isLast);

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
                            key={result.path}
                            result={result}
                            isActive={index === activeIndex}
                            optionId={optionId(result.path)}
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

    const { asking, results, searching, failed } = useGuideSearch(typed);

    useSearchHotkey(() => setOpen(!open));

    const select = useCallback(
        (result: GuideResult) => {
            setOpen(false);
            router.push(result.path);
        },
        [router, setOpen]
    );

    const { activeIndex, isFirst, isLast, setActiveIndex, onKeyDown } = useRovingList({
        items: results,
        onSelect: select
    });

    let emptyMessage: string | null = null;
    if (!asking) emptyMessage = 'Ask anything about seedcord, or type a term.';
    else if (failed) emptyMessage = 'Search is unavailable right now. Try again in a minute.';

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
                        onValueChange={setTyped}
                        onKeyDown={onKeyDown}
                        onClose={() => setOpen(false)}
                        label={SEARCH_LABEL}
                        closeLabel="Close search"
                        placeholder="Search the guide"
                        maxLength={QUESTION_LENGTH.max}
                        listboxId={LISTBOX_ID}
                        listExpanded={results.length > 0}
                        isSearching={searching}
                        {...(active ? { activeId: optionId(active.path) } : {})}
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
