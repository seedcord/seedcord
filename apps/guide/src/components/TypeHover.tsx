'use client';

import { Popover, PopoverAnchor, PopoverContent, cn, tw } from '@seedcord/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ReactElement, ReactNode } from 'react';

const TOKEN = '.twoslash-hover';
const TYPE = '.twoslash-popup-code';
const POPOVER = '[data-radix-popper-content-wrapper]';

// long enough to cross the 6px gap without tracing a straight line
const CLOSE_GRACE_MS = 140;

interface Shown {
    html: string;
    left: number;
    top: number;
    width: number;
    height: number;
}

function readToken(token: Element): Shown | null {
    const type = token.querySelector(TYPE);
    if (!type) return null;

    const { left, top, width, height } = token.getBoundingClientRect();

    return { html: type.innerHTML, left, top, width, height };
}

const CONTENT = cn(
    tw`type-hover-scroll max-w-[min(36rem,calc(100vw-2rem))] overflow-x-auto p-0 shadow-none`,
    tw`font-mono text-xs/relaxed whitespace-pre`
);

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
                        <div
                            className={cn('w-max min-w-full px-2.5 py-1.5')}
                            dangerouslySetInnerHTML={{ __html: shown.html }}
                        />
                    </PopoverContent>
                ) : null}
            </Popover>
        </div>
    );
}
