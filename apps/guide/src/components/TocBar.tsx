'use client';

import { Disclosure, DisclosureChevron, DisclosureTrigger, cn, easeInOutStrong, easeOutStrong, tw } from '@seedcord/ui';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { activeRangeOf, idOf, indentOf, labelClassName, rowClassName } from './TableOfContents';

import type { TableOfContentsProps } from './TableOfContents';
import type { Variants } from 'motion/react';
import type { ReactElement } from 'react';

const barClassName = cn(
    tw`relative border-b border-(--border) bg-(--bg-navbar) backdrop-blur`,
    tw`transition-colors duration-150 ease-out`
);
// the open panel carries the bottom edge, and a transparent border holds the 1px so nothing shifts
const barOpenClassName = tw`border-b-transparent`;
const eyebrowClassName = cn(labelClassName, tw`mb-0 shrink-0`);
// 44px, the tap-target floor
const triggerHeight = tw`h-11`;

// --shadow-card-md reaches 8px up over the trigger, 12px of blur against a 4px offset. 8% matches
// that token's own weight, and the negative spread keeps the whole thing below the panel's top.
const panelShadow = tw`shadow-[0_10px_20px_-8px_color-mix(in_oklab,var(--color-text)_8%,transparent)]`;

const panelClassName = cn(tw`absolute inset-x-0 top-full origin-top`, tw`border-b bg-(--bg-navbar)`, panelShadow);

const PANEL_SECONDS = 0.16;
const UNFOLD_SCALE = 0.96;

const INSTANT: Variants = {
    hidden: { opacity: 0 },
    shown: { opacity: 1, transition: { duration: 0 } },
    gone: { opacity: 0, transition: { duration: 0 } }
};

// ease-out-strong covers three quarters of its distance in the first fifth of the duration
const PANEL_MOTION: Variants = {
    hidden: { opacity: 0, scaleY: UNFOLD_SCALE },
    shown: { opacity: 1, scaleY: 1, transition: { duration: PANEL_SECONDS, ease: easeOutStrong } },
    gone: { opacity: 0, scaleY: UNFOLD_SCALE, transition: { duration: PANEL_SECONDS, ease: easeInOutStrong } }
};

export function TocBar({ items, activeIds, className }: TableOfContentsProps): ReactElement {
    const [open, setOpen] = useState(false);
    const reducedMotion = useReducedMotion() ?? false;
    const ref = useRef<HTMLDivElement>(null);
    const active = new Set(activeIds);
    const range = activeRangeOf(items, active);
    const current = range ? items[range.end] : undefined;

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent): void => {
            if (event.target instanceof Node && ref.current?.contains(event.target)) return;
            setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') setOpen(false);
        };

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={ref} className={cn(className)}>
            <Disclosure open={open} onOpenChange={setOpen} className={cn(barClassName, open && barOpenClassName)}>
                <DisclosureTrigger className={cn(triggerHeight, 'gap-2 px-4 text-sm md:px-6')}>
                    <span className={cn(eyebrowClassName)}>On this page</span>
                    <span aria-hidden className={cn('shrink-0 text-(--text-faint)')}>
                        /
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate text-left text-(--text)')}>{current?.title}</span>
                    <DisclosureChevron />
                </DisclosureTrigger>
                <AnimatePresence>
                    {open ? (
                        <m.div
                            variants={reducedMotion ? INSTANT : PANEL_MOTION}
                            initial="hidden"
                            animate="shown"
                            exit="gone"
                            className={cn(panelClassName, 'overflow-hidden')}
                        >
                            <div
                                className={cn(
                                    'nice-scroll max-h-[50dvh] overflow-y-auto overscroll-contain px-4 py-3 text-[13px] md:px-6'
                                )}
                            >
                                {items.map((item) => {
                                    const isActive = active.has(idOf(item.url));
                                    return (
                                        <a
                                            key={item.url}
                                            href={item.url}
                                            onClick={() => setOpen(false)}
                                            aria-current={isActive ? 'location' : undefined}
                                            className={cn(
                                                rowClassName,
                                                tw`border-l`,
                                                indentOf(item.depth),
                                                isActive
                                                    ? tw`border-(--flesh) text-(--flesh)`
                                                    : tw`border-(--border) text-(--text-muted)`
                                            )}
                                        >
                                            {item.title}
                                        </a>
                                    );
                                })}
                            </div>
                        </m.div>
                    ) : null}
                </AnimatePresence>
            </Disclosure>
        </div>
    );
}
