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
    useNavigateAndClose,
    useRovingList,
    useSearchHotkey
} from '@seedcord/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import { SearchResultRow } from './SearchResultRow';
import { SearchResultsSkeleton } from './SearchResultsSkeleton';
import { emptyMessage, useGuideSearch } from './useGuideSearch';

import type { ResultGroup } from './useGuideSearch';
import type { GuideResult } from '@seedcord/docs-search';
import type { RovingGroup, RovingList } from '@seedcord/ui';
import type { ReactElement } from 'react';

const LISTBOX_ID = 'guide-search-results';

export const SEARCH_LABEL = 'Search the guide';

function optionId(path: string): string {
    return `guide-search-${path}`;
}

const NO_ROWS: readonly GuideResult[] = [];

function rovingGroups(groups: readonly ResultGroup[]): RovingGroup<GuideResult>[] {
    return groups.map((group) => ({
        items: group.status === 'done' ? group.results : NO_ROWS,
        loading: group.status === 'pending'
    }));
}

interface GroupProps {
    group: ResultGroup;
    roving: RovingList<GuideResult>;
    onSelect: (result: GuideResult) => void;
}

function GroupBody({ group, roving, onSelect }: GroupProps): ReactElement | ReactElement[] {
    if (group.status === 'pending') return <SearchResultsSkeleton />;
    if (group.status === 'failed') {
        return (
            <p aria-hidden className={cn('text-subtle px-3 py-2 text-sm')}>
                {group.notice}
            </p>
        );
    }
    return group.results.map((result) => (
        <SearchResultRow
            key={result.path}
            result={result}
            isActive={roving.isActive(result)}
            optionId={optionId(result.path)}
            onSelect={onSelect}
            onActivate={roving.pointAt}
        />
    ));
}

function Group(props: GroupProps): ReactElement {
    return (
        <div role="group" aria-label={props.group.label} className={cn('mt-3 first:mt-0')}>
            <div aria-hidden className={cn(SECTION_LABEL, 'px-3 pb-2')}>
                {props.group.label}
            </div>
            <GroupBody {...props} />
        </div>
    );
}

interface ResultsProps extends Omit<GroupProps, 'group'> {
    groups: readonly ResultGroup[];
    message: string | undefined;
}

function Results({ groups, message, roving, onSelect }: ResultsProps): ReactElement {
    useActiveRowScroll(roving.active ? optionId(roving.active.path) : undefined, roving);

    return (
        <div className={cn('py-3')}>
            {message === undefined ? (
                <div id={LISTBOX_ID} role="listbox" aria-label="Search results">
                    {groups.map((group) => (
                        <Group key={group.label} group={group} roving={roving} onSelect={onSelect} />
                    ))}
                </div>
            ) : (
                <div className={cn('text-subtle px-3 py-8 text-center text-sm')}>{message}</div>
            )}
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
    const navigate = useNavigateAndClose(useRouter(), setOpen);

    const groups = useGuideSearch(typed, open);

    useSearchHotkey(() => setOpen(!open));

    const select = useCallback((result: GuideResult) => navigate(result.path), [navigate]);

    const roving = useRovingList({ query: typed, groups: rovingGroups(groups), onSelect: select });
    const { active } = roving;

    return (
        <>
            <SearchTrigger label={SEARCH_LABEL} onOpen={() => setOpen(true)} />
            <SearchDialog
                open={open}
                onOpenChange={setOpen}
                onClose={() => setOpen(false)}
                title="Search"
                description="Search every page in the seedcord guide."
                footer={active === undefined ? undefined : <SearchKeyLegend hasGroups={roving.hasGroups} />}
                field={
                    <SearchField
                        inputRef={inputRef}
                        value={typed}
                        onValueChange={setTyped}
                        onKeyDown={roving.onKeyDown}
                        onClose={() => setOpen(false)}
                        label={SEARCH_LABEL}
                        closeLabel="Close search"
                        placeholder="Search the guide"
                        maxLength={QUESTION_LENGTH.max}
                        listboxId={LISTBOX_ID}
                        listExpanded={active !== undefined}
                        isSearching={groups.some((group) => group.status === 'pending')}
                        {...(active ? { activeId: optionId(active.path) } : {})}
                    />
                }
            >
                <Results groups={groups} message={emptyMessage(typed, groups)} roving={roving} onSelect={select} />
                {/* a screen reader announces a change inside a status region that already exists */}
                <p role="status" className={cn('sr-only')}>
                    {groups.find((group) => group.status === 'failed')?.notice}
                </p>
            </SearchDialog>
        </>
    );
}
