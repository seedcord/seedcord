'use client';

import { Disclosure, DisclosureChevron, DisclosureTrigger, cn, easeInOutStrong, easeOutStrong, tw } from '@seedcord/ui';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { activeRangeOf, idOf, indentOf, labelClassName, rowClassName } from './TableOfContents';

import type { TableOfContentsProps } from './TableOfContents';
import type { Variants } from 'motion/react';
import type { CSSProperties, ReactElement, RefObject } from 'react';

const barClassName = cn(
    tw`relative border-b border-(--border) bg-(--bg-navbar) backdrop-blur`,
    tw`transition-colors duration-150 ease-out`
);
// a transparent border holds the bar's height while the panel draws the visible edge
const barOpenClassName = tw`border-b-transparent`;
const eyebrowClassName = cn(labelClassName, tw`mb-0 shrink-0`);
// 44px, the minimum tap target
const triggerHeight = tw`h-11`;

// -8px of spread starts the shadow below the panel's top so it never darkens the trigger
const panelShadow = tw`shadow-[0_10px_20px_-8px_color-mix(in_oklab,var(--color-text)_8%,transparent)]`;

// the 1px overlap covers the hairline where the panel meets the blurred bar at a fractional offset
const panelClassName = cn(
    tw`absolute inset-x-0 top-full -mt-px origin-top`,
    tw`border-b bg-(--bg-navbar)`,
    panelShadow
);

const PANEL_SECONDS = 0.16;
const UNFOLD_SCALE = 0.96;

const INSTANT: Variants = {
    hidden: { opacity: 0 },
    shown: { opacity: 1, transition: { duration: 0 } },
    gone: { opacity: 0, transition: { duration: 0 } }
};

const PANEL_MOTION: Variants = {
    hidden: { opacity: 0, scaleY: UNFOLD_SCALE },
    shown: { opacity: 1, scaleY: 1, transition: { duration: PANEL_SECONDS, ease: easeOutStrong } },
    gone: { opacity: 0, scaleY: UNFOLD_SCALE, transition: { duration: PANEL_SECONDS, ease: easeInOutStrong } }
};

// this matches the 2px active underline in NavTabs
const progressClassName = tw`pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left bg-(--flesh)`;
const progressStyle = { transform: 'scaleX(var(--read, 0))' } as CSSProperties;

// writes a css variable so a scroll never re-renders
function useReadProgress(target: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const element = target.current;
        if (!element) return;

        let frame = 0;
        const write = (): void => {
            frame = 0;
            const scrollable = document.documentElement.scrollHeight - window.innerHeight;
            const read = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
            element.style.setProperty('--read', String(read));
        };
        const schedule = (): void => {
            if (frame === 0) frame = requestAnimationFrame(write);
        };

        write();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            if (frame !== 0) cancelAnimationFrame(frame);
        };
    }, [target]);
}

export function TocBar({ items, activeIds, className }: TableOfContentsProps): ReactElement {
    const [open, setOpen] = useState(false);
    const reducedMotion = useReducedMotion() ?? false;
    const ref = useRef<HTMLDivElement>(null);
    const active = new Set(activeIds);
    const range = activeRangeOf(items, active);
    const current = range ? items[range.end] : undefined;

    useReadProgress(ref);

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
                {open ? null : <span aria-hidden className={cn(progressClassName)} style={progressStyle} />}
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
