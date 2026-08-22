'use client';

import { Popover, PopoverAnchor, PopoverContent, cn, tw } from '@seedcord/ui';
import { ArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Ref } from '#components/Ref';

import type { CSSProperties, PointerEvent, ReactElement, ReactNode } from 'react';

const TOKEN = '.twoslash-hover';
const TYPE = '.twoslash-popup-code';
const POPOVER = '[data-radix-popper-content-wrapper]';

// twoslash.css underlines the marked token
const OPEN_ATTR = 'data-type-hover-open';

// long enough to cross the 6px gap without tracing a straight line
const CLOSE_GRACE_MS = 140;

// matches the 1rem the max-width already reserves on each side
const EDGE_GAP_PX = 16;

interface Shown {
    html: string;
    reference: { pkg: string; symbol: string } | null;
    left: number;
    top: number;
    width: number;
    height: number;
}

function readToken(token: Element): Shown | null {
    const type = token.querySelector(TYPE);
    if (!type) return null;

    const pkg = token.getAttribute('data-ref-pkg');
    const symbol = token.getAttribute('data-ref-symbol');
    const { left, top, width, height } = token.getBoundingClientRect();

    return { html: type.innerHTML, reference: pkg && symbol ? { pkg, symbol } : null, left, top, width, height };
}

const CONTENT = cn(
    tw`type-hover-scroll max-h-[min(20rem,50vh)] max-w-[min(36rem,calc(100vw-2rem))] overflow-auto overscroll-none p-0 shadow-none`,
    tw`font-mono text-xs/relaxed whitespace-pre`
);

// radix cannot anchor to a token react never rendered
function anchorRect(shown: Shown): CSSProperties {
    return {
        position: 'fixed',
        left: shown.left,
        top: shown.top,
        width: shown.width,
        height: shown.height,
        pointerEvents: 'none'
    };
}

function TypeBody({ shown }: { shown: Shown }): ReactElement {
    return (
        <>
            <div className={cn('w-max min-w-full px-2.5 py-1.5')} dangerouslySetInnerHTML={{ __html: shown.html }} />
            {shown.reference ? (
                <div
                    className={cn(
                        'sticky bottom-0 left-0 border-t border-(--border) bg-(--bg-popover)',
                        'px-2.5 py-1 font-sans text-[0.6875rem]'
                    )}
                >
                    <Ref pkg={shown.reference.pkg} symbol={shown.reference.symbol}>
                        <span className={cn('inline-flex items-center gap-1')}>
                            Read {shown.reference.symbol} on the reference site
                            <ArrowUpRight size={12} aria-hidden className={cn('text-(--text-faint)')} />
                        </span>
                    </Ref>
                </div>
            ) : null}
        </>
    );
}

// scrolling and resizing both move the token out from under a rect measured in viewport space
function useDropOnViewportChange(open: boolean, setOpen: (open: false) => void): void {
    useEffect(() => {
        if (!open) return undefined;

        const drop = (event: Event): void => {
            const moved = event.target as Element | null;
            if (moved?.closest?.(POPOVER)) return;
            setOpen(false);
        };
        window.addEventListener('scroll', drop, true);
        window.addEventListener('resize', drop);

        return () => {
            window.removeEventListener('scroll', drop, true);
            window.removeEventListener('resize', drop);
        };
    }, [open, setOpen]);
}

export function TypeHover({ children }: { children: ReactNode }): ReactElement {
    // the last token stays rendered while radix plays its close animation
    const [shown, setShown] = useState<Shown | null>(null);
    const [open, setOpen] = useState(false);
    const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
    const marked = useRef<Element | null>(null);

    const mark = useCallback((token: Element | null) => {
        marked.current?.removeAttribute(OPEN_ATTR);
        marked.current = token;
        token?.setAttribute(OPEN_ATTR, '');
    }, []);

    const hold = useCallback(() => {
        if (closing.current) clearTimeout(closing.current);
        closing.current = null;
    }, []);

    const release = useCallback(
        (event?: PointerEvent<HTMLElement>) => {
            // the browser destroys a touch pointer the moment the finger lifts
            if (event && event.pointerType !== 'mouse') return;
            hold();
            closing.current = setTimeout(() => setOpen(false), CLOSE_GRACE_MS);
        },
        [hold]
    );

    const show = useCallback(
        (event: { target: EventTarget | null }) => {
            const from = event.target as Element | null;
            // a react portal still bubbles its events through the react tree
            if (from?.closest(POPOVER)) {
                hold();
                return;
            }

            const token = from?.closest(TOKEN);
            if (!token) return;

            const next = readToken(token);
            if (next) {
                hold();
                mark(token);
                setShown(next);
                setOpen(true);
            }
        },
        [hold, mark]
    );

    useEffect(() => {
        if (!open) mark(null);
    }, [open, mark]);

    useEffect(() => () => hold(), [hold]);
    useDropOnViewportChange(open, setOpen);

    return (
        <div onPointerOver={show} onPointerOut={release} onClick={show}>
            {children}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverAnchor style={shown ? anchorRect(shown) : undefined} />
                {shown ? (
                    <PopoverContent
                        side="top"
                        align="start"
                        sideOffset={6}
                        collisionPadding={EDGE_GAP_PX}
                        className={CONTENT}
                        onOpenAutoFocus={(event) => event.preventDefault()}
                        onPointerOver={hold}
                        onPointerOut={release}
                    >
                        <TypeBody shown={shown} />
                    </PopoverContent>
                ) : null}
            </Popover>
        </div>
    );
}
