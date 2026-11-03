'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, m } from 'motion/react';
import { createContext, use, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Card } from './Card';
import { cn } from './lib/cn';
import { easeOutStrong } from './lib/motion';
import { tw } from './lib/tw';
import { useFocusReturn } from './lib/useFocusReturn';

import type { RowPosition } from './lib/useRovingList';
import type { Transition } from 'motion/react';
import type { ReactElement, ReactNode, RefObject } from 'react';

const HEIGHT_TRANSITION: Transition = { duration: 0.2, ease: [...easeOutStrong] };
const EDGE = tw`px-2`;
const DIALOG_CARD = tw`mx-auto flex max-h-[78vh] w-full max-w-xl flex-col bg-(--bg-dim) text-(--text) transition sm:max-w-2xl md:max-w-3xl`;

export interface SearchDialogScroll {
    toTop: () => void;
    toBottom: () => void;
    toTopOf: (element: Element) => void;
}

interface SearchDialogHandles {
    container: HTMLElement | null;
    listExpanded: boolean;
    scroll: SearchDialogScroll;
}

const NO_SCROLL: SearchDialogScroll = { toTop: () => {}, toBottom: () => {}, toTopOf: () => {} };

const SearchDialogContext = createContext<SearchDialogHandles>({
    container: null,
    listExpanded: false,
    scroll: NO_SCROLL
});

// a popover inside the dialog portals to the body without this node
export function useSearchDialogContainer(): HTMLElement | null {
    return use(SearchDialogContext).container;
}

export function useSearchDialogListExpanded(): boolean {
    return use(SearchDialogContext).listExpanded;
}

export function useSearchDialogScroll(): SearchDialogScroll {
    return use(SearchDialogContext).scroll;
}

// useLayoutEffect puts the scroll in the same frame as the moved selection. useEffect paints them one apart
export function useActiveRowScroll(
    activeId: string | undefined,
    { isFirst, isLast, isGroupStart, pickedByPointer }: RowPosition
): void {
    const scroll = useSearchDialogScroll();

    useLayoutEffect(() => {
        // a row under the pointer is already on screen
        if (activeId === undefined || pickedByPointer) return;
        // scrolling the whole way at the ends keeps the list's own padding in view
        if (isFirst) {
            scroll.toTop();
            return;
        }
        if (isLast) {
            scroll.toBottom();
            return;
        }
        const row = document.getElementById(activeId);
        const group = isGroupStart ? row?.closest('[role="group"]') : null;
        // scrollIntoView with block start also scrolls the overflow-hidden panel
        if (group) scroll.toTopOf(group);
        else row?.scrollIntoView({ block: 'nearest' });
    }, [activeId, isFirst, isLast, isGroupStart, pickedByPointer, scroll]);
}

function listScroll(scrollRef: RefObject<HTMLDivElement | null>): SearchDialogScroll {
    return {
        toTop: () => scrollRef.current?.scrollTo({ top: 0 }),
        toBottom: () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
        toTopOf: (element) => {
            const scroller = scrollRef.current;
            if (!scroller) return;
            const offset = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
            scroller.scrollTo({ top: scroller.scrollTop + offset });
        }
    };
}

// picking a filter inside a popover reads as an outside interaction
function isWithinPopover(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('[data-radix-popper-content-wrapper]') !== null;
}

function useMeasuredHeight(): [number, (el: HTMLDivElement | null) => void] {
    const observerRef = useRef<ResizeObserver | null>(null);
    const [height, setHeight] = useState(0);

    // the radix portal drops this node on close. a callback ref re-attaches the observer on the next open
    const measureRef = useCallback((el: HTMLDivElement | null) => {
        observerRef.current?.disconnect();
        if (!el) {
            observerRef.current = null;
            return;
        }
        const observer = new ResizeObserver(() => setHeight(el.scrollHeight));
        // ResizeObserver invokes its callback on observe() to seed the first height
        observer.observe(el);
        observerRef.current = observer;
    }, []);

    return [height, measureRef];
}

function Footer({ children }: { children: ReactNode }): ReactElement {
    return <div className={cn(EDGE, 'border-border hidden shrink-0 border-t py-2 sm:block')}>{children}</div>;
}

interface FieldAreaProps {
    note: ReactNode;
    lineShown: boolean;
    children: ReactNode;
}

function FieldArea({ note, lineShown, children }: FieldAreaProps): ReactElement {
    return (
        <div className={cn('relative shrink-0')}>
            <div className={cn(EDGE, 'py-2')}>{children}</div>
            <AnimatePresence initial={false}>
                {note === undefined ? null : (
                    <m.div
                        key="note"
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={HEIGHT_TRANSITION}
                        className={cn(
                            'overflow-hidden border-(--border)',
                            'sm:absolute sm:-inset-x-px sm:bottom-full sm:-mb-2 sm:min-h-2.25 sm:rounded-t-md',
                            'sm:border sm:border-b-0 sm:bg-(--bg-dim)'
                        )}
                    >
                        <div className={cn(EDGE, 'pb-2 sm:pt-2')}>{note}</div>
                    </m.div>
                )}
            </AnimatePresence>
            <m.div
                initial={false}
                animate={{ opacity: lineShown ? 1 : 0 }}
                transition={HEIGHT_TRANSITION}
                className={cn('absolute inset-x-0 bottom-0 h-px bg-(--border)')}
            />
        </div>
    );
}

export interface SearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClose: () => void;
    title: string;
    description: string;
    field: ReactNode;
    fieldNote?: ReactNode;
    listExpanded: boolean;
    footer: ReactNode;
    children?: ReactNode;
}

export function SearchDialog({
    open,
    onOpenChange,
    onClose,
    title,
    description,
    field,
    fieldNote,
    listExpanded,
    footer,
    children
}: SearchDialogProps): ReactElement {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const [contentHeight, measureRef] = useMeasuredHeight();
    const focusReturn = useFocusReturn();
    const handles = useMemo<SearchDialogHandles>(
        () => ({
            container,
            listExpanded,
            scroll: listScroll(scrollRef)
        }),
        [container, listExpanded]
    );

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay
                    data-command-overlay
                    className={cn('fixed inset-0 z-60 bg-(--command-overlay)/70 backdrop-blur-sm')}
                />
                <Dialog.Content
                    ref={setContainer}
                    aria-modal
                    {...focusReturn}
                    data-command-content
                    className={cn(
                        'fixed inset-0 z-70 flex items-start justify-center px-4 pt-20 pb-8',
                        'sm:px-6 sm:pt-24 md:pt-28 md:pb-12 lg:pt-32 lg:pb-16'
                    )}
                    onInteractOutside={(event) => {
                        if (isWithinPopover(event.detail.originalEvent.target)) {
                            event.preventDefault();
                            return;
                        }
                        onClose();
                    }}
                    onPointerDown={(event) => {
                        const target = event.target as Node | null;
                        if (!panelRef.current || !target) return;
                        if (!panelRef.current.contains(target) && !isWithinPopover(target)) onClose();
                    }}
                >
                    <Card size="none" className={DIALOG_CARD}>
                        <div ref={panelRef} className={cn('flex min-h-0 flex-col')}>
                            <Dialog.Title className={cn('sr-only')}>{title}</Dialog.Title>
                            <Dialog.Description className={cn('sr-only')}>{description}</Dialog.Description>
                            <SearchDialogContext.Provider value={handles}>
                                <FieldArea note={fieldNote} lineShown={listExpanded}>
                                    {field}
                                </FieldArea>
                                <m.div
                                    ref={scrollRef}
                                    animate={{ height: contentHeight }}
                                    transition={HEIGHT_TRANSITION}
                                    className={cn(EDGE, 'min-h-0 overflow-y-auto overscroll-contain')}
                                >
                                    <div ref={measureRef}>{children}</div>
                                </m.div>
                                {listExpanded ? <Footer>{footer}</Footer> : null}
                            </SearchDialogContext.Provider>
                        </div>
                    </Card>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
