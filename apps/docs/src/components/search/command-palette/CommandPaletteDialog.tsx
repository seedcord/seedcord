'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Card, cn, easeOutStrong } from '@seedcord/ui';
import { m } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CommandHeader } from './CommandHeader';
import { CommandListItem } from './CommandListItem';
import { COMMAND_LISTBOX_ID, MIN_SEARCH_QUERY_LENGTH } from './constants';
import { useCommandPaletteSearch } from './useCommandPaletteSearch';

import type { CommandAction, SearchGroup } from './types';
import type { CommandPaletteController } from './useCommandPaletteController';
import type { KeyboardEvent, ReactElement } from 'react';

const HEIGHT_ANIMATION_S = 1;

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
    groups: SearchGroup[];
    activeIndex: number;
    onSelect: (action: CommandAction) => void;
    onActivate: (index: number) => void;
}

// Each group's rows occupy a contiguous slice of the flat active-index space, so a running offset maps a
// row to its global index for keyboard nav.
function renderGroups(
    groups: SearchGroup[],
    activeIndex: number,
    onSelect: (action: CommandAction) => void,
    onActivate: (index: number) => void
): ReactElement[] {
    let offset = 0;
    return groups.map((group) => {
        const start = offset;
        offset += group.results.length;
        return (
            <div key={group.label} role="presentation">
                <div className={cn('flex items-center justify-between px-3 pt-2 pb-1')}>
                    <span className={cn('text-subtle text-xs font-semibold tracking-wide')}>
                        {group.current ? `${group.label} (current)` : group.label}
                    </span>
                    <span className={cn('text-xs text-(--text-faint)')}>{group.results.length}</span>
                </div>
                {group.results.map((action, index) => (
                    <CommandListItem
                        key={action.id}
                        action={action}
                        onSelect={onSelect}
                        isActive={start + index === activeIndex}
                        optionId={optionId(action.id)}
                        index={start + index}
                        onActivate={onActivate}
                    />
                ))}
            </div>
        );
    });
}

function CommandListContent({
    showInitialHint,
    isSearching,
    errorMessage,
    groups,
    activeIndex,
    onSelect,
    onActivate
}: CommandListContentProps): ReactElement | null {
    const hasResults = groups.length > 0;
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
                    {renderGroups(groups, activeIndex, onSelect, onActivate)}
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
        groups: searchState.groups,
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
    // The dropdown listboxes portal here (inside the dialog) so their lists scroll under the scroll lock.
    const [container, setContainer] = useState<HTMLElement | null>(null);

    const normalizedSearch = useMemo(() => searchValue.trim(), [searchValue]);
    const searchState = useCommandPaletteSearch({
        query: normalizedSearch,
        open,
        scope: controller.scope,
        kind: controller.kind
    });
    const listProps = deriveListProps(searchState, normalizedSearch);
    const { groups } = listProps;
    const results = useMemo(() => groups.flatMap((group) => group.results), [groups]);

    // A new result set re-anchors the active row to the top. Adjusting during render (not in an effect)
    // avoids a wasted render pass and the set-state-in-effect smell.
    const [trackedGroups, setTrackedGroups] = useState(groups);
    if (trackedGroups !== groups) {
        setTrackedGroups(groups);
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
                                packages={controller.packages}
                                container={container}
                                onScopeChange={controller.handleScopeChange}
                                onKindChange={controller.handleKindChange}
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
