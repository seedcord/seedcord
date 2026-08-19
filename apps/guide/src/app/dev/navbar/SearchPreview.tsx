'use client';

import { SearchDialog, SearchField, cn, useActiveRowScroll, useRovingList } from '@seedcord/ui';
import { useMemo, useRef, useState } from 'react';

import { MOCK_SEARCH_RESULTS } from './mockSearch';

import type { MockSearchResult } from './mockSearch';
import type { ReactElement } from 'react';

const SEARCH_LISTBOX_ID = 'guide-search-results';

function rowId(id: string): string {
    return `guide-search-${id}`;
}

interface SearchPreviewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    label: string;
}

export function SearchPreview({ open, onOpenChange, label }: SearchPreviewProps): ReactElement {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');

    const matches = useMemo(
        () =>
            MOCK_SEARCH_RESULTS.filter((result) =>
                `${result.title} ${result.tab}`.toLowerCase().includes(query.trim().toLowerCase())
            ),
        [query]
    );
    const expanded = query.trim().length > 0 && matches.length > 0;
    const close = (): void => onOpenChange(false);

    const { activeIndex, isFirst, isLast, setActiveIndex, onKeyDown } = useRovingList({
        items: matches,
        onSelect: close
    });
    const active = matches[activeIndex];

    return (
        <SearchDialog
            open={open}
            onOpenChange={onOpenChange}
            onClose={close}
            title="Search the guide"
            description="Search guide pages by title and section."
            field={
                <SearchField
                    inputRef={inputRef}
                    value={query}
                    onValueChange={setQuery}
                    onKeyDown={onKeyDown}
                    onClose={close}
                    label={label}
                    closeLabel="Close search"
                    listboxId={SEARCH_LISTBOX_ID}
                    listExpanded={expanded}
                    activeId={active ? rowId(active.id) : undefined}
                />
            }
        >
            {expanded ? (
                <SearchResults
                    matches={matches}
                    activeIndex={activeIndex}
                    isFirst={isFirst}
                    isLast={isLast}
                    onActivate={setActiveIndex}
                />
            ) : null}
        </SearchDialog>
    );
}

interface SearchResultsProps {
    matches: readonly MockSearchResult[];
    activeIndex: number;
    isFirst: boolean;
    isLast: boolean;
    onActivate: (index: number) => void;
}

function SearchResults({ matches, activeIndex, isFirst, isLast, onActivate }: SearchResultsProps): ReactElement {
    const active = matches[activeIndex];
    useActiveRowScroll(active ? rowId(active.id) : undefined, isFirst, isLast);

    return (
        <div id={SEARCH_LISTBOX_ID} role="listbox" aria-label="Search results" className={cn('py-3')}>
            {matches.map((result, index) => (
                <div
                    key={result.id}
                    id={rowId(result.id)}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => onActivate(index)}
                    className={cn('mx-2 rounded-md px-3 py-2', index === activeIndex && 'bg-(--bg-accent-b-moderate)')}
                >
                    <div className={cn('flex items-baseline gap-2')}>
                        <span className={cn('text-sm font-semibold text-(--text)')}>{result.title}</span>
                        <span className={cn('text-xs text-(--text-faint)')}>{result.tab}</span>
                    </div>
                    <p className={cn('mt-0.5 text-xs text-(--text-muted)')}>{result.excerpt}</p>
                </div>
            ))}
        </div>
    );
}
