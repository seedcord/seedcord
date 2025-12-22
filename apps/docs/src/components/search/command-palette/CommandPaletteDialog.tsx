'use client';

import * as Dialog from '@radix-ui/react-dialog';
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
            <div className="text-subtle px-4 py-12 text-center text-sm">
                Type at least {MIN_SEARCH_QUERY_LENGTH} characters to explore the documentation index.
            </div>
        );
    } else if (errorMessage) {
        emptyContent = (
            <div className="mx-2 rounded-xl border border-[color-mix(in_oklab,var(--accent-b)_32%,var(--border))] bg-[color-mix(in_oklab,var(--accent-b)_10%,var(--surface)_90%)] px-3 py-2 text-sm text-[color-mix(in_oklab,var(--text)_85%,var(--accent-b)_15%)]">
                {errorMessage}
            </div>
        );
    } else if (shouldShowFallback) {
        emptyContent = (
            <div className="text-subtle px-3 py-8 text-center text-sm">No results found. Try refining your search.</div>
        );
    }

    return (
        <>
            {emptyContent ? <Command.Empty>{emptyContent}</Command.Empty> : null}
            {isSearching ? (
                <Command.Loading>
                    <div className="text-subtle px-2 py-6 text-center text-sm">Searching documentation…</div>
                </Command.Loading>
            ) : null}
            {shouldShowItems
                ? results.map((action) => <CommandListItem key={action.id} action={action} onSelect={onSelect} />)
                : null}
        </>
    );
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
    const canShowResults = normalizedSearch.length >= MIN_SEARCH_QUERY_LENGTH;
    const isSearching = searchState.status === 'loading';
    const hasError = searchState.status === 'error';
    const showInitialHint = !canShowResults;
    const resolvedError = hasError ? (searchState.error ?? 'Search failed. Please try again.') : undefined;
    const listProps: CommandListContentProps = {
        showInitialHint,
        isSearching,
        results: searchState.results,
        onSelect: handleSelect
    };

    if (resolvedError) {
        listProps.errorMessage = resolvedError;
    }

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    data-command-overlay
                    className="fixed inset-0 z-60 bg-(--command-overlay)/70 backdrop-blur-sm"
                />
                <Dialog.Content
                    data-command-content
                    className="fixed inset-0 z-70 flex items-start justify-center px-4 pt-20 pb-8 sm:px-6 sm:pt-24 md:pt-28 md:pb-12 lg:pt-32 lg:pb-16"
                    onInteractOutside={handleClose}
                    onPointerDown={(event) => {
                        const target = event.target as Node | null;
                        if (!commandRef.current || !target) return;
                        if (!commandRef.current.contains(target)) {
                            handleClose();
                        }
                    }}
                >
                    <Command
                        ref={commandRef}
                        className="card shadow-soft mx-auto max-h-[78vh] w-full max-w-xl overflow-hidden bg-(--bg-dim) text-(--text) transition sm:max-w-2xl md:max-w-3xl"
                        label="Documentation search"
                        onKeyDown={handleKeyDown}
                    >
                        <Dialog.Title className="sr-only">Command palette</Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Search documentation content and navigation items.
                        </Dialog.Description>
                        <CommandHeader
                            inputRef={inputRef}
                            onClose={handleClose}
                            onValueChange={handleValueChange}
                            searchValue={searchValue}
                        />
                        <Command.List className="max-h-[calc(78vh-5.25rem)] overflow-y-auto overscroll-contain px-2 pb-3">
                            <CommandListContent {...listProps} />
                        </Command.List>
                    </Command>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default CommandPaletteDialog;
