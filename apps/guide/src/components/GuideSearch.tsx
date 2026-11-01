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
import type { RovingGroup, RowPosition } from '@seedcord/ui';
import type { ReactElement } from 'react';

const LISTBOX_ID = 'guide-search-results';

export const SEARCH_LABEL = 'Search the guide';

function optionId(path: string): string {
    return `guide-search-${path}`;
}

interface PlacedGroup {
    group: ResultGroup;
    start: number;
}

interface ResultList {
    groups: PlacedGroup[];
    rows: GuideResult[];
    roving: RovingGroup[];
}

function placeGroups(groups: readonly ResultGroup[]): ResultList {
    const placed: PlacedGroup[] = [];
    const rows: GuideResult[] = [];
    const roving: RovingGroup[] = [];
    for (const group of groups) {
        placed.push({ group, start: rows.length });
        if (group.status === 'pending') roving.push({ loading: true });
        if (group.status === 'done') {
            roving.push({ loading: false, start: rows.length });
            rows.push(...group.results);
        }
    }
    return { groups: placed, rows, roving };
}

interface RowEvents {
    activeIndex: number;
    onSelect: (result: GuideResult) => void;
    onActivate: (index: number) => void;
}

function GroupBody({
    placed: { group, start },
    activeIndex,
    onSelect,
    onActivate
}: RowEvents & { placed: PlacedGroup }): ReactElement | ReactElement[] {
    if (group.status === 'pending') return <SearchResultsSkeleton />;
    if (group.status === 'failed') {
        return (
            <p aria-hidden className={cn('text-subtle px-3 py-2 text-sm')}>
                {group.notice}
            </p>
        );
    }
    return group.results.map((result, offset) => (
        <SearchResultRow
            key={result.path}
            result={result}
            isActive={start + offset === activeIndex}
            optionId={optionId(result.path)}
            index={start + offset}
            onSelect={onSelect}
            onActivate={onActivate}
        />
    ));
}

function Group(props: RowEvents & { placed: PlacedGroup }): ReactElement {
    const { label } = props.placed.group;
    return (
        <div role="group" aria-label={label} className={cn('mt-3 first:mt-0')}>
            <div aria-hidden className={cn(SECTION_LABEL, 'px-3 pb-2')}>
                {label}
            </div>
            <GroupBody {...props} />
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

    // a null child collapses the animated panel to only the bar with the hint
    if (emptyMessage === null && list.groups.length === 0) return null;

    return (
        <div className={cn('py-3')}>
            {emptyMessage === null ? null : (
                <div className={cn('text-subtle px-3 py-8 text-center text-sm')}>{emptyMessage}</div>
            )}
            {list.groups.length > 0 ? (
                <div id={LISTBOX_ID} role="listbox" aria-label="Search results">
                    {list.groups.map((placed) => (
                        <Group key={placed.group.label} placed={placed} {...rowEvents} />
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

    const groups = useGuideSearch(typed, open);
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
        groups: list.roving,
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
                footer={list.rows.length === 0 ? undefined : <SearchKeyLegend hasGroups={list.roving.length > 1} />}
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
                        isSearching={groups.some((group) => group.status === 'pending')}
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
                    {groups.find((group) => group.status === 'failed')?.notice}
                </p>
            </SearchDialog>
        </>
    );
}
