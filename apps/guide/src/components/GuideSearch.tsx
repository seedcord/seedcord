'use client';

import { QUESTION_LENGTH } from '@seedcord/docs-search';
import {
    SECTION_LABEL,
    SearchDialog,
    SearchField,
    SearchKeyLegend,
    SearchTrigger,
    cn,
    useActiveRowScroll,
    useRovingList,
    useSearchHotkey
} from '@seedcord/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState, useTransition } from 'react';

import { SearchResultRow } from './SearchResultRow';
import { SearchResultsSkeleton } from './SearchResultsSkeleton';
import { useGuideSearch } from './useGuideSearch';

import type { ResultGroup } from './useGuideSearch';
import type { GuideResult } from '@seedcord/docs-search';
import type { RowPosition } from '@seedcord/ui';
import type { ReactElement } from 'react';

const LISTBOX_ID = 'guide-search-results';

export const SEARCH_LABEL = 'Search the guide';

function optionId(path: string): string {
    return `guide-search-${path}`;
}

interface PlacedRow {
    result: GuideResult;
    index: number;
}

interface PlacedGroup extends Omit<ResultGroup, 'results'> {
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
    for (const { results, ...group } of groups) {
        if (results.length > 0 || group.pending) groupStarts.push(rows.length);
        placed.push({ ...group, rows: results.map((result, offset) => ({ result, index: rows.length + offset })) });
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
            <div aria-hidden className={cn(SECTION_LABEL, 'px-3 pb-2')}>
                {group.label}
            </div>
            {group.pending ? <SearchResultsSkeleton /> : null}
            {group.notice === undefined ? null : (
                <p aria-hidden className={cn('text-subtle px-3 py-2 text-sm')}>
                    {group.notice}
                </p>
            )}
            {group.rows.map(({ result, index }) => (
                <SearchResultRow
                    key={result.path}
                    result={result}
                    terms={group.terms}
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
    position,
    emptyMessage,
    ...rowEvents
}: RowEvents & {
    list: ResultList;
    position: RowPosition;
    emptyMessage: string | null;
}): ReactElement | null {
    const active = list.rows[rowEvents.activeIndex];
    useActiveRowScroll(active ? optionId(active.path) : undefined, position);

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

    const { groups, searching } = useGuideSearch(typed);
    // useRovingList tracks the rows by identity
    const list = useMemo(() => placeGroups(groups), [groups]);

    useSearchHotkey(() => setOpen(!open));

    const [, startTransition] = useTransition();
    // react commits this close together with the pushed page
    const select = useCallback(
        (result: GuideResult) =>
            startTransition(() => {
                router.push(result.path);
                setOpen(false);
            }),
        [router, setOpen]
    );

    const { activeIndex, pointAt, onKeyDown, ...position } = useRovingList({
        items: list.rows,
        groupStarts: list.groupStarts,
        onSelect: select
    });

    const emptyMessage = typed.trim() === '' ? 'Ask anything about seedcord, or type a term.' : null;

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
                    list.rows.length === 0 ? undefined : <SearchKeyLegend hasGroups={list.groupStarts.length > 1} />
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
                    position={position}
                    onSelect={select}
                    onActivate={pointAt}
                    emptyMessage={emptyMessage}
                />
                {/* a screen reader announces a change inside a status region that already exists */}
                <p role="status" className={cn('sr-only')}>
                    {groups.find((group) => group.notice !== undefined)?.notice}
                </p>
            </SearchDialog>
        </>
    );
}
