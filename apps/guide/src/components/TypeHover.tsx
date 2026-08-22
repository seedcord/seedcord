'use client';

import { Popover, PopoverAnchor, PopoverContent, cn, tw } from '@seedcord/ui';
import { ArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Ref } from '#components/Ref';

import type { ReactElement, ReactNode } from 'react';

const TOKEN = '.twoslash-hover';
const TYPE = '.twoslash-popup-code';
const POPOVER = '[data-radix-popper-content-wrapper]';

// long enough to cross the 6px gap without tracing a straight line
const CLOSE_GRACE_MS = 140;

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

export function TypeHover({ children }: { children: ReactNode }): ReactElement {
    // the last token stays rendered while radix plays its close animation
    const [shown, setShown] = useState<Shown | null>(null);
    const [open, setOpen] = useState(false);
    const closing = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hold = useCallback(() => {
        if (closing.current) clearTimeout(closing.current);
        closing.current = null;
    }, []);

    const release = useCallback(() => {
        hold();
        closing.current = setTimeout(() => setOpen(false), CLOSE_GRACE_MS);
    }, [hold]);

    // a react portal still bubbles its events through the react tree
    const show = useCallback(
        (event: { target: EventTarget | null }) => {
            const from = event.target as Element | null;
            if (from?.closest(POPOVER)) {
                hold();
                return;
            }

            const token = from?.closest(TOKEN);
            if (!token) return;

            const next = readToken(token);
            if (next) {
                hold();
                setShown(next);
                setOpen(true);
            }
        },
        [hold]
    );

    // scrolling moves the token out from under a rect measured in viewport space
    useEffect(() => {
        if (!open) return undefined;

        const drop = (event: Event): void => {
            const scrolled = event.target as Element | null;
            if (scrolled?.closest?.(POPOVER)) return;
            setOpen(false);
        };
        window.addEventListener('scroll', drop, true);

        return () => window.removeEventListener('scroll', drop, true);
    }, [open]);

    return (
        <div onPointerOver={show} onPointerOut={release} onClick={show}>
            {children}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverAnchor
                    style={
                        shown
                            ? {
                                  position: 'fixed',
                                  left: shown.left,
                                  top: shown.top,
                                  width: shown.width,
                                  height: shown.height,
                                  pointerEvents: 'none'
                              }
                            : undefined
                    }
                />
                {shown ? (
                    <PopoverContent
                        side="top"
                        align="start"
                        sideOffset={6}
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
