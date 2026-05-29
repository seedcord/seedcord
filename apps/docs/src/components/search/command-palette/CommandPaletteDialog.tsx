'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Card, cn } from '@seedcord/ui';
import { Command } from 'cmdk';
import { useMemo, useRef } from 'react';

import CommandHeader from './CommandHeader';
import CommandListItem from './CommandListItem';
import { MIN_SEARCH_QUERY_LENGTH } from './constants';
import { useCommandPaletteSearch } from './useCommandPaletteSearch';

import type { CommandAction } from './types';
import type { CommandPaletteController } from './useCommandPaletteController';
import type { ReactElement } from 'react';

interface CommandListContentProps {
    showInitialHint: boolean;
    isSearching: boolean;
    errorMessage?: string;
    results: CommandAction[];
    onSelect: (action: CommandAction) => void;
}

function CommandListContent({
    showInitialHint,
    isSearching,
    errorMessage,
    results,
    onSelect
}: CommandListContentProps): ReactElement {
    const hasResults = results.length > 0;
    const shouldShowItems = !showInitialHint && !isSearching && !errorMessage && hasResults;
    const shouldShowFallback = !showInitialHint && !isSearching && !errorMessage && !hasResults;

    let emptyContent: ReactElement | null = null;

    if (showInitialHint) {
        emptyContent = (
            <div className={cn('text-subtle px-4 py-12 text-center text-sm')}>
                Type at least {MIN_SEARCH_QUERY_LENGTH} characters to explore the documentation index.
            </div>
        );
    } else if (errorMessage) {
        emptyContent = (
            <div
                className={cn(
                    'mx-2 rounded-xl border border-(--border-accent-b-subtle) bg-(--surface-accent-b-subtle) px-3 py-2 text-sm text-(--text-accent-b-subtle)'
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

    return (
        <>
            {emptyContent ? <Command.Empty>{emptyContent}</Command.Empty> : null}
            {isSearching ? (
                <Command.Loading>
                    <div className={cn('text-subtle px-2 py-6 text-center text-sm')}>Searching documentation…</div>
                </Command.Loading>
            ) : null}
            {shouldShowItems
                ? results.map((action) => <CommandListItem key={action.id} action={action} onSelect={onSelect} />)
                : null}
        </>
    );
}

function deriveListProps(
    searchState: ReturnType<typeof useCommandPaletteSearch>,
    normalizedSearch: string,
    onSelect: (action: CommandAction) => void
): CommandListContentProps {
    const showInitialHint = normalizedSearch.length < MIN_SEARCH_QUERY_LENGTH;
    const isSearching = searchState.status === 'loading';
    const resolvedError =
        searchState.status === 'error' ? (searchState.error ?? 'Search failed. Please try again.') : undefined;
    return {
        showInitialHint,
        isSearching,
        results: searchState.results,
        onSelect,
        ...(resolvedError ? { errorMessage: resolvedError } : {})
    };
}

function CommandPaletteDialog({ controller }: { controller: CommandPaletteController }): ReactElement {
    const {
        open,
        handleOpenChange,
        searchValue,
        handleValueChange,
        handleClose,
        handleSelect,
        handleKeyDown,
        inputRef
    } = controller;

    const commandRef = useRef<HTMLDivElement | null>(null);

    const normalizedSearch = useMemo(() => searchValue.trim(), [searchValue]);
    const searchState = useCommandPaletteSearch({ query: normalizedSearch, open });
    const listProps = deriveListProps(searchState, normalizedSearch, handleSelect);

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    data-command-overlay
                    className={cn('fixed inset-0 z-60 bg-(--command-overlay)/70 backdrop-blur-sm')}
                />
                <Dialog.Content
                    data-command-content
                    className={cn(
                        'fixed inset-0 z-70 flex items-start justify-center px-4 pt-20 pb-8 sm:px-6 sm:pt-24 md:pt-28 md:pb-12 lg:pt-32 lg:pb-16'
                    )}
                    onInteractOutside={handleClose}
                    onPointerDown={(event) => {
                        const target = event.target as Node | null;
                        if (!commandRef.current || !target) return;
                        if (!commandRef.current.contains(target)) {
                            handleClose();
                        }
                    }}
                >
                    <Card
                        size="none"
                        className={cn(
                            'mx-auto max-h-[78vh] w-full max-w-xl overflow-hidden bg-(--bg-dim) text-(--text) transition sm:max-w-2xl md:max-w-3xl'
                        )}
                    >
                        <Command
                            ref={commandRef}
                            className={cn('flex h-full flex-col')}
                            label="Documentation search"
                            onKeyDown={handleKeyDown}
                        >
                            <Dialog.Title className={cn('sr-only')}>Command palette</Dialog.Title>
                            <Dialog.Description className={cn('sr-only')}>
                                Search documentation content and navigation items.
                            </Dialog.Description>
                            <CommandHeader
                                inputRef={inputRef}
                                onClose={handleClose}
                                onValueChange={handleValueChange}
                                searchValue={searchValue}
                            />
                            <Command.List
                                className={cn(
                                    'max-h-[calc(78vh-5.25rem)] overflow-y-auto overscroll-contain px-2 py-3'
                                )}
                            >
                                <CommandListContent {...listProps} />
                            </Command.List>
                        </Command>
                    </Card>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default CommandPaletteDialog;
