'use client';

import { QUESTION_LENGTH } from '@seedcord/docs-search';
import {
    KeyLegend,
    SearchDialog,
    SearchField,
    SearchTrigger,
    cn,
    useActiveRowScroll,
    useRovingList,
    useSearchHotkey
} from '@seedcord/ui';
import { ArrowDown, ArrowUp, CornerDownLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';

import { SearchResultRow } from './SearchResultRow';
import { SearchResultsSkeleton } from './SearchResultsSkeleton';
import { useGuideSearch } from './useGuideSearch';

import type { ResultGroup } from './useGuideSearch';
import type { GuideResult } from '@seedcord/docs-search';
import type { KeyHint } from '@seedcord/ui';
import type { ReactElement } from 'react';

const LISTBOX_ID = 'guide-search-results';

const ROW_HINTS: readonly KeyHint[] = [
    {
        keys: [
            { label: 'Up', icon: ArrowUp },
            { label: 'Down', icon: ArrowDown }
        ],
        action: 'move'
    },
    { keys: [{ label: 'Enter', icon: CornerDownLeft }], action: 'open' }
];
const GROUP_HINTS: readonly KeyHint[] = [...ROW_HINTS, { keys: [{ label: 'Tab' }], action: 'next group' }];

export const SEARCH_LABEL = 'Search the guide';

function optionId(path: string): string {
    return `guide-search-${path}`;
}

interface PlacedRow {
    result: GuideResult;
    index: number;
}

interface PlacedGroup {
    label: string;
    pending: boolean;
    rows: PlacedRow[];
}

interface ResultList {
    groups: PlacedGroup[];
    rows: GuideResult[];
    groupStarts: number[];
}

function placeGroups(groups: readonly ResultGroup[]): ResultList {
    const placed: PlacedGroup[] = [];
    const rows: GuideResult[] = [];
    const groupStarts: number[] = [];
    for (const { label, pending, results } of groups) {
        if (results.length > 0) groupStarts.push(rows.length);
        placed.push({
            label,
            pending,
            rows: results.map((result, offset) => ({ result, index: rows.length + offset }))
        });
        rows.push(...results);
    }
    return { groups: placed, rows, groupStarts };
}

interface RowEvents {
    activeIndex: number;
    onSelect: (result: GuideResult) => void;
    onActivate: (index: number) => void;
}

function Group({ group, activeIndex, onSelect, onActivate }: RowEvents & { group: PlacedGroup }): ReactElement {
    return (
        <div role="group" aria-label={group.label} className={cn('mt-3 first:mt-0')}>
            <div aria-hidden className={cn('text-subtle px-3 pb-1 text-xs font-medium tracking-wide uppercase')}>
                {group.label}
            </div>
            {group.pending ? <SearchResultsSkeleton /> : null}
            {group.rows.map(({ result, index }) => (
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
    );
}

function Results({
    list,
    isFirst,
    isLast,
    emptyMessage,
    ...rowEvents
}: RowEvents & {
    list: ResultList;
    isFirst: boolean;
    isLast: boolean;
    emptyMessage: string | null;
}): ReactElement | null {
    const active = list.rows[rowEvents.activeIndex];
    useActiveRowScroll(active ? optionId(active.path) : undefined, isFirst, isLast);

    // a null child collapses the animated panel back to just the bar with the hint
    if (emptyMessage === null && list.groups.length === 0) return null;

    return (
        <div className={cn('py-3')}>
            {emptyMessage === null ? null : (
                <div className={cn('text-subtle px-3 py-8 text-center text-sm')}>{emptyMessage}</div>
            )}
            {list.groups.length > 0 ? (
                <div id={LISTBOX_ID} role="listbox" aria-label="Search results">
                    {list.groups.map((group) => (
                        <Group key={group.label} group={group} {...rowEvents} />
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

    const { groups, searching, failed } = useGuideSearch(typed);
    // useRovingList tracks the rows by identity
    const list = useMemo(() => placeGroups(groups), [groups]);

    useSearchHotkey(() => setOpen(!open));

    const select = useCallback(
        (result: GuideResult) => {
            setOpen(false);
            router.push(result.path);
        },
        [router, setOpen]
    );

    const { activeIndex, isFirst, isLast, setActiveIndex, onKeyDown } = useRovingList({
        items: list.rows,
        groupStarts: list.groupStarts,
        onSelect: select
    });

    let emptyMessage: string | null = null;
    if (typed.trim() === '') emptyMessage = 'Ask anything about seedcord, or type a term.';
    else if (failed) emptyMessage = 'Search is unavailable right now. Try again in a minute.';

    const active = list.rows[activeIndex];

    return (
        <>
            <SearchTrigger label={SEARCH_LABEL} onOpen={() => setOpen(true)} />
            <SearchDialog
                open={open}
                onOpenChange={setOpen}
                onClose={() => setOpen(false)}
                title="Search"
                description="Search every page in the seedcord guide."
                footer={
                    list.rows.length === 0 ? undefined : (
                        <KeyLegend hints={list.groupStarts.length > 1 ? GROUP_HINTS : ROW_HINTS} />
                    )
                }
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
                        listExpanded={list.rows.length > 0}
                        isSearching={searching}
                        {...(active ? { activeId: optionId(active.path) } : {})}
                    />
                }
            >
                <Results
                    list={list}
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
