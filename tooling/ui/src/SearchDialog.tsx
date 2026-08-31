'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { m } from 'motion/react';
import { createContext, use, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Card } from './Card';
import { cn } from './lib/cn';
import { easeOutStrong } from './lib/motion';

import type { ReactElement, ReactNode } from 'react';

const HEIGHT_ANIMATION_S = 0.2;

export interface SearchDialogScroll {
    toTop: () => void;
    toBottom: () => void;
}

interface SearchDialogHandles {
    container: HTMLElement | null;
    scroll: SearchDialogScroll;
}

const NO_SCROLL: SearchDialogScroll = { toTop: () => {}, toBottom: () => {} };

const SearchDialogContext = createContext<SearchDialogHandles>({ container: null, scroll: NO_SCROLL });

// a popover inside the dialog portals to the body without this node
export function useSearchDialogContainer(): HTMLElement | null {
    return use(SearchDialogContext).container;
}

export function useSearchDialogScroll(): SearchDialogScroll {
    return use(SearchDialogContext).scroll;
}

// the ends scroll the whole way so the list keeps its own padding in view.
// useLayoutEffect puts the scroll in the same frame as the moved selection. useEffect paints them one apart
export function useActiveRowScroll(activeId: string | undefined, isFirst: boolean, isLast: boolean): void {
    const scroll = useSearchDialogScroll();

    useLayoutEffect(() => {
        if (activeId === undefined) return;
        if (isFirst) {
            scroll.toTop();
            return;
        }
        if (isLast) {
            scroll.toBottom();
            return;
        }
        document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
    }, [activeId, isFirst, isLast, scroll]);
}

// picking a filter inside a popover reads as an outside interaction
function isWithinPopover(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('[data-radix-popper-content-wrapper]') !== null;
}

function useMeasuredHeight(): [number, (el: HTMLDivElement | null) => void] {
    const observerRef = useRef<ResizeObserver | null>(null);
    const [height, setHeight] = useState(0);

    // the radix portal drops this node on close. a callback ref re-attaches the observer on every open,
    // and ResizeObserver fires once on observe() to seed the first height.
    const measureRef = useCallback((el: HTMLDivElement | null) => {
        observerRef.current?.disconnect();
        if (!el) {
            observerRef.current = null;
            return;
        }
        const observer = new ResizeObserver(() => setHeight(el.scrollHeight));
        observer.observe(el);
        observerRef.current = observer;
    }, []);

    return [height, measureRef];
}

export interface SearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClose: () => void;
    title: string;
    description: string;
    field: ReactNode;
    children?: ReactNode;
}

export function SearchDialog({
    open,
    onOpenChange,
    onClose,
    title,
    description,
    field,
    children
}: SearchDialogProps): ReactElement {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const [contentHeight, measureRef] = useMeasuredHeight();
    const handles = useMemo<SearchDialogHandles>(
        () => ({
            container,
            scroll: {
                toTop: () => scrollRef.current?.scrollTo({ top: 0 }),
                toBottom: () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
            }
        }),
        [container]
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
                    <Card
                        size="none"
                        className={cn(
                            'mx-auto max-h-[78vh] w-full max-w-xl overflow-hidden bg-(--bg-dim) text-(--text)',
                            'transition sm:max-w-2xl md:max-w-3xl'
                        )}
                    >
                        <div ref={panelRef} className={cn('flex h-full flex-col')}>
                            <Dialog.Title className={cn('sr-only')}>{title}</Dialog.Title>
                            <Dialog.Description className={cn('sr-only')}>{description}</Dialog.Description>
                            <SearchDialogContext.Provider value={handles}>
                                {field}
                                <m.div
                                    ref={scrollRef}
                                    animate={{ height: contentHeight }}
                                    transition={{ duration: HEIGHT_ANIMATION_S, ease: [...easeOutStrong] }}
                                    className={cn('max-h-[calc(78vh-5.25rem)] overflow-y-auto overscroll-contain px-2')}
                                >
                                    <div ref={measureRef}>{children}</div>
                                </m.div>
                            </SearchDialogContext.Provider>
                        </div>
                    </Card>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
