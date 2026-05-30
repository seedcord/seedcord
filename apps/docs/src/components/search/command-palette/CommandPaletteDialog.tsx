'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Card, cn, easeOutStrong } from '@seedcord/ui';
import { m } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CommandHeader } from './CommandHeader';
import { CommandListItem } from './CommandListItem';
import { COMMAND_LISTBOX_ID, MIN_SEARCH_QUERY_LENGTH } from './constants';
import { useCommandPaletteSearch } from './useCommandPaletteSearch';

import type { CommandAction } from './types';
import type { CommandPaletteController } from './useCommandPaletteController';
import type { KeyboardEvent, ReactElement } from 'react';

const HEIGHT_ANIMATION_S = 1;

function optionId(id: string): string {
    return `command-option-${id}`;
}

interface CommandListContentProps {
    showInitialHint: boolean;
    isSearching: boolean;
    errorMessage?: string;
    results: CommandAction[];
    activeIndex: number;
    onSelect: (action: CommandAction) => void;
    onActivate: (index: number) => void;
}

function CommandListContent({
    showInitialHint,
    isSearching,
    errorMessage,
    results,
    activeIndex,
    onSelect,
    onActivate
}: CommandListContentProps): ReactElement | null {
    const hasResults = results.length > 0;
    // Items stay visible during a refresh (stale results) so the list doesn't flicker; the header spinner
    // signals loading. The "no results" fallback waits for loading to finish to avoid a false flash.
    const shouldShowItems = !showInitialHint && !errorMessage && hasResults;
    const shouldShowFallback = !showInitialHint && !isSearching && !errorMessage && !hasResults;

    let emptyContent: ReactElement | null = null;
    if (errorMessage) {
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

    // Rendering null (e.g. under the min query length) collapses the animated panel back to the bare bar.
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
): Omit<CommandListContentProps, 'activeIndex' | 'onSelect' | 'onActivate'> {
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

// eslint-disable-next-line max-lines-per-function -- dialog wires search state, roving keyboard nav, and the animated list
export function CommandPaletteDialog({ controller }: { controller: CommandPaletteController }): ReactElement {
    const { open, handleOpenChange, searchValue, handleValueChange, handleClose, handleSelect, inputRef } = controller;

    const commandRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<ResizeObserver | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);

    const normalizedSearch = useMemo(() => searchValue.trim(), [searchValue]);
    const searchState = useCommandPaletteSearch({ query: normalizedSearch, open });
    const listProps = deriveListProps(searchState, normalizedSearch);
    const { results } = listProps;

    // A new result set re-anchors the active row to the top. Adjusting during render (not in an effect)
    // avoids a wasted render pass and the set-state-in-effect smell.
    const [trackedResults, setTrackedResults] = useState(results);
    if (trackedResults !== results) {
        setTrackedResults(results);
        setActiveIndex(0);
    }

    // The animated container follows the measured body height. A callback ref re-attaches the observer every
    // time the dialog opens (the measured node only exists in the DOM while the Radix portal is mounted); the
    // observer fires on observe() and on every later content change, so it owns the measurement.
    const measureRef = useCallback((el: HTMLDivElement | null) => {
        observerRef.current?.disconnect();
        if (!el) {
            observerRef.current = null;
            return;
        }
        const observer = new ResizeObserver(() => {
            setContentHeight(el.scrollHeight);
        });
        observer.observe(el);
        observerRef.current = observer;
    }, []);

    const activeAction = results[activeIndex];
    const activeId = activeAction ? optionId(activeAction.id) : undefined;
    const listExpanded = !listProps.showInitialHint && !listProps.errorMessage && results.length > 0;

    useEffect(() => {
        if (!activeId) return;
        document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
    }, [activeId]);

    const handleListKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (results.length === 0) return;
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setActiveIndex((index) => (index + 1) % results.length);
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setActiveIndex((index) => (index - 1 + results.length) % results.length);
                    break;
                case 'Home':
                    event.preventDefault();
                    setActiveIndex(0);
                    break;
                case 'End':
                    event.preventDefault();
                    setActiveIndex(results.length - 1);
                    break;
                case 'Enter': {
                    event.preventDefault();
                    if (activeAction) handleSelect(activeAction);
                    break;
                }
                default:
                    break;
            }
        },
        [results, activeAction, handleSelect]
    );

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
                        <div ref={commandRef} className={cn('flex h-full flex-col')}>
                            <Dialog.Title className={cn('sr-only')}>Command palette</Dialog.Title>
                            <Dialog.Description className={cn('sr-only')}>
                                Search documentation content and navigation items.
                            </Dialog.Description>
                            <CommandHeader
                                inputRef={inputRef}
                                onClose={handleClose}
                                onValueChange={handleValueChange}
                                onKeyDown={handleListKeyDown}
                                searchValue={searchValue}
                                isSearching={listProps.isSearching}
                                activeId={activeId}
                                listExpanded={listExpanded}
                            />
                            <m.div
                                animate={{ height: contentHeight }}
                                transition={{ duration: HEIGHT_ANIMATION_S, ease: [...easeOutStrong] }}
                                className={cn('max-h-[calc(78vh-5.25rem)] overflow-y-auto overscroll-contain px-2')}
                            >
                                <div ref={measureRef}>
                                    <CommandListContent
                                        {...listProps}
                                        activeIndex={activeIndex}
                                        onSelect={handleSelect}
                                        onActivate={setActiveIndex}
                                    />
                                </div>
                            </m.div>
                        </div>
                    </Card>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
