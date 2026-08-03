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

const HEIGHT_ANIMATION_S = 0.2;

function optionId(id: string): string {
    return `command-option-${id}`;
}

// The scope/kind dropdowns portal their listbox outside the dialog, so a click on an option reads as an
// outside interaction; ignore anything inside a Radix popper wrapper so selecting a filter never closes
// the palette.
function isWithinPopover(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('[data-radix-popper-content-wrapper]') !== null;
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
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<ResizeObserver | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);
    // The dropdown listboxes portal here (inside the dialog) so their lists scroll under the scroll lock.
    const [container, setContainer] = useState<HTMLElement | null>(null);

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

    // A new result set re-anchors the active row to the top. Adjusting during render (not in an effect)
    // avoids a wasted render pass and the set-state-in-effect smell.
    const [trackedResults, setTrackedResults] = useState(results);
    if (trackedResults !== results) {
        setTrackedResults(results);
        setActiveIndex(0);
    }

    // The animated container follows the measured body height. A callback ref re-attaches the observer every
    // time the dialog opens (the measured node only exists in the DOM while the Radix portal is mounted); the
    // observer fires on observe() and on every later content change.
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
        // Fixes first searched entity being scrolled up to be flush with the top when it should keep the padding and header.
        if (activeIndex === 0) {
            scrollRef.current?.scrollTo({ top: 0 });
            return;
        }
        document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
    }, [activeId, activeIndex]);

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
                    ref={setContainer}
                    data-command-content
                    className={cn(
                        'fixed inset-0 z-70 flex items-start justify-center px-4 pt-20 pb-8 sm:px-6 sm:pt-24 md:pt-28 md:pb-12 lg:pt-32 lg:pb-16'
                    )}
                    onInteractOutside={(event) => {
                        if (isWithinPopover(event.detail.originalEvent.target)) {
                            event.preventDefault();
                            return;
                        }
                        handleClose();
                    }}
                    onPointerDown={(event) => {
                        const target = event.target as Node | null;
                        if (!commandRef.current || !target) return;
                        if (!commandRef.current.contains(target) && !isWithinPopover(target)) {
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
                                scope={controller.scope}
                                kind={controller.kind}
                                prerelease={controller.prerelease}
                                packages={controller.packages}
                                container={container}
                                onScopeChange={controller.handleScopeChange}
                                onKindChange={controller.handleKindChange}
                                onPrereleaseChange={controller.handlePrereleaseChange}
                            />
                            <m.div
                                ref={scrollRef}
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
