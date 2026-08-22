'use client';

import { Popover, PopoverAnchor, PopoverContent, cn, tw } from '@seedcord/ui';
import { ArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Ref } from '#components/Ref';

import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent, ReactElement, ReactNode, RefObject } from 'react';

const TOKEN = '.twoslash-hover';
const TYPE = '.twoslash-popup-code';
const POPOVER = '[data-radix-popper-content-wrapper]';

// twoslash.css underlines the marked token
const OPEN_ATTR = 'data-type-hover-open';

// long enough to cross the 6px gap without tracing a straight line
const CLOSE_GRACE_MS = 140;

// matches the 1rem the max-width already reserves on each side
const EDGE_GAP_PX = 16;

const ARROW_STEP: Record<string, number | undefined> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

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

    // shiki wraps a multi-line type in a focusable pre of its own
    const copy = type.cloneNode(true) as Element;
    for (const stop of copy.querySelectorAll('[tabindex]')) stop.removeAttribute('tabindex');

    const pkg = token.getAttribute('data-ref-pkg');
    const symbol = token.getAttribute('data-ref-symbol');
    const { left, top, width, height } = token.getBoundingClientRect();

    return { html: copy.innerHTML, reference: pkg && symbol ? { pkg, symbol } : null, left, top, width, height };
}

const CONTENT = cn(
    tw`type-hover-scroll max-h-[min(20rem,50vh)] max-w-[min(36rem,calc(100vw-2rem))] overflow-auto overscroll-none p-0 shadow-none`,
    tw`font-mono text-xs/relaxed whitespace-pre`
);

// radix cannot anchor to a token that wasn't rendered
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

interface TypePopupProps {
    shown: Shown;
    keyboard: RefObject<boolean>;
    hold: () => void;
    release: (event: PointerEvent<HTMLElement>) => void;
}

function TypePopup({ shown, keyboard, hold, release }: TypePopupProps): ReactElement {
    return (
        <PopoverContent
            side="top"
            align="start"
            sideOffset={6}
            collisionPadding={EDGE_GAP_PX}
            className={CONTENT}
            onOpenAutoFocus={(event) => {
                if (!keyboard.current) event.preventDefault();
            }}
            // only escape restores focus. tab keeps going where it was heading
            onCloseAutoFocus={(event) => event.preventDefault()}
            onPointerOver={hold}
            onPointerOut={release}
        >
            <TypeBody shown={shown} />
        </PopoverContent>
    );
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

// radix portals the popup out of this block
function focusLeftTheBlock(event: FocusEvent<HTMLDivElement>): boolean {
    const to = event.relatedTarget;

    return !event.currentTarget.contains(to) && !to?.closest(POPOVER);
}

// highlightToHtml renders each block once per theme and hides one
function isShowing(node: Element): boolean {
    for (let step: Element | null = node; step; step = step.parentElement) {
        if (getComputedStyle(step).display === 'none') return false;
    }

    return true;
}

type Show = (event: { target: EventTarget | null }, fromKey?: boolean) => void;

// one tab stop per code block, since a page carries dozens of tokens
function useTokenWalk(
    marked: RefObject<Element | null>,
    show: Show,
    close: () => void
): { block: RefObject<HTMLDivElement | null>; walk: (event: KeyboardEvent<HTMLDivElement>) => void } {
    const block = useRef<HTMLDivElement>(null);

    const walk = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Escape') {
                close();
                block.current?.focus();
                return;
            }

            const step = ARROW_STEP[event.key];
            if (!step || !block.current) return;

            const tokens = [...block.current.querySelectorAll(TOKEN)].filter(
                (node) => node.querySelector(TYPE) && isShowing(node)
            );
            const next = tokens[tokens.indexOf(marked.current as Element) + step];
            if (!next) return;

            event.preventDefault();
            show({ target: next }, true);
        },
        [close, marked, show]
    );

    return { block, walk };
}

export function TypeHover({ children }: { children: ReactNode }): ReactElement {
    // the last token stays rendered while radix plays its close animation
    const [shown, setShown] = useState<Shown | null>(null);
    const [open, setOpen] = useState(false);
    const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
    const marked = useRef<Element | null>(null);
    const byKey = useRef(false);

    const mark = useCallback((token: Element | null) => {
        marked.current?.removeAttribute(OPEN_ATTR);
        marked.current = token;
        token?.setAttribute(OPEN_ATTR, '');
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        mark(null);
    }, [mark]);

    const hold = useCallback(() => {
        if (closing.current) clearTimeout(closing.current);
        closing.current = null;
    }, []);

    const release = useCallback(
        (event?: PointerEvent<HTMLElement>) => {
            // the browser destroys a touch pointer the moment the finger lifts
            if (event && event.pointerType !== 'mouse') return;
            hold();
            closing.current = setTimeout(close, CLOSE_GRACE_MS);
        },
        [close, hold]
    );

    const show = useCallback(
        (event: { target: EventTarget | null }, fromKey = false) => {
            byKey.current = fromKey;
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

    useEffect(() => () => hold(), [hold]);
    useDropOnViewportChange(open, close);

    const { block, walk } = useTokenWalk(marked, show, close);

    return (
        <div
            ref={block}
            role="group"
            tabIndex={0}
            aria-label="Code sample. Arrow keys walk its types."
            onKeyDown={walk}
            onBlur={(event) => focusLeftTheBlock(event) && close()}
            onPointerOver={show}
            onPointerOut={release}
            onClick={show}
        >
            {children}
            <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
                <PopoverAnchor style={shown ? anchorRect(shown) : undefined} />
                {shown ? <TypePopup shown={shown} keyboard={byKey} hold={hold} release={release} /> : null}
            </Popover>
        </div>
    );
}
