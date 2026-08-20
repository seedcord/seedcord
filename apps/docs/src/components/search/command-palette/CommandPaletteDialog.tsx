'use client';

import { SearchDialog, cn, useActiveRowScroll, useRovingList } from '@seedcord/ui';
import { useMemo } from 'react';

import { CommandHeader } from './CommandHeader';
import { CommandListItem } from './CommandListItem';
import { COMMAND_LISTBOX_ID, MIN_SEARCH_QUERY_LENGTH } from './constants';
import { useCommandPaletteSearch } from './useCommandPaletteSearch';

import type { CommandAction } from './types';
import type { CommandPaletteController } from './useCommandPaletteController';
import type { ReactElement } from 'react';

function optionId(id: string): string {
    return `command-option-${id}`;
}

interface CommandListContentProps {
    showInitialHint: boolean;
    isSearching: boolean;
    errorMessage?: string;
    results: CommandAction[];
    activeIndex: number;
    isFirst: boolean;
    isLast: boolean;
    onSelect: (action: CommandAction) => void;
    onActivate: (index: number) => void;
}

function CommandListContent({
    showInitialHint,
    isSearching,
    errorMessage,
    results,
    activeIndex,
    isFirst,
    isLast,
    onSelect,
    onActivate
}: CommandListContentProps): ReactElement | null {
    const active = results[activeIndex];
    useActiveRowScroll(active ? optionId(active.id) : undefined, isFirst, isLast);

    const hasResults = results.length > 0;
    // the isSearching guard keeps "no results" from flashing between keystrokes
    const shouldShowItems = !showInitialHint && !errorMessage && hasResults;
    const shouldShowFallback = !showInitialHint && !isSearching && !errorMessage && !hasResults;

    let emptyContent: ReactElement | null = null;
    if (errorMessage) {
        emptyContent = (
            <div
                className={cn(
                    'mx-2 rounded-md border border-(--border-accent-b-subtle) bg-(--surface-accent-b-subtle) px-3 py-2 text-sm text-(--text-accent-b-subtle)'
                )}
            >
                {errorMessage}
            </div>
        );
    } else if (shouldShowFallback) {
        emptyContent = (
            <div className={cn('text-subtle px-3 py-8 text-center text-sm')}>
                No results found. Try refining your search.
            </div>
        );
    }

    // null measures as zero height, which collapses the animated panel back to the bare bar
    if (!emptyContent && !shouldShowItems) return null;

    return (
        <div className={cn('py-3')}>
            {emptyContent}
            {shouldShowItems ? (
                <div id={COMMAND_LISTBOX_ID} role="listbox" aria-label="Search results">
                    {results.map((action, index) => (
                        <CommandListItem
                            key={action.id}
                            action={action}
                            onSelect={onSelect}
                            isActive={index === activeIndex}
                            optionId={optionId(action.id)}
                            index={index}
                            onActivate={onActivate}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function deriveListProps(
    searchState: ReturnType<typeof useCommandPaletteSearch>,
    normalizedSearch: string
): Omit<CommandListContentProps, 'activeIndex' | 'isFirst' | 'isLast' | 'onSelect' | 'onActivate'> {
    const showInitialHint = normalizedSearch.length < MIN_SEARCH_QUERY_LENGTH;
    const isSearching = searchState.status === 'loading';
    const resolvedError =
        searchState.status === 'error' ? (searchState.error ?? 'Search failed. Please try again.') : undefined;
    return {
        showInitialHint,
        isSearching,
        results: searchState.results,
        ...(resolvedError ? { errorMessage: resolvedError } : {})
    };
}

export function CommandPaletteDialog({ controller }: { controller: CommandPaletteController }): ReactElement {
    const { open, handleOpenChange, searchValue, handleValueChange, handleClose, handleSelect, inputRef } = controller;

    const normalizedSearch = useMemo(() => searchValue.trim(), [searchValue]);
    const searchState = useCommandPaletteSearch({
        query: normalizedSearch,
        open,
        scope: controller.scope,
        kind: controller.kind,
        prerelease: controller.prerelease
    });
    const listProps = deriveListProps(searchState, normalizedSearch);
    const { results } = listProps;

    const { activeIndex, isFirst, isLast, setActiveIndex, onKeyDown } = useRovingList({
        items: results,
        onSelect: handleSelect
    });

    const activeAction = results[activeIndex];
    const activeId = activeAction ? optionId(activeAction.id) : undefined;
    const listExpanded = !listProps.showInitialHint && !listProps.errorMessage && results.length > 0;

    return (
        <SearchDialog
            open={open}
            onOpenChange={handleOpenChange}
            onClose={handleClose}
            title="Command palette"
            description="Search documentation content and navigation items."
            field={
                <CommandHeader
                    inputRef={inputRef}
                    onClose={handleClose}
                    onValueChange={handleValueChange}
                    onKeyDown={onKeyDown}
                    searchValue={searchValue}
                    isSearching={listProps.isSearching}
                    activeId={activeId}
                    listExpanded={listExpanded}
                    scope={controller.scope}
                    kind={controller.kind}
                    prerelease={controller.prerelease}
                    packages={controller.packages}
                    onScopeChange={controller.handleScopeChange}
                    onKindChange={controller.handleKindChange}
                    onPrereleaseChange={controller.handlePrereleaseChange}
                />
            }
        >
            <CommandListContent
                {...listProps}
                activeIndex={activeIndex}
                isFirst={isFirst}
                isLast={isLast}
                onSelect={handleSelect}
                onActivate={setActiveIndex}
            />
        </SearchDialog>
    );
}
