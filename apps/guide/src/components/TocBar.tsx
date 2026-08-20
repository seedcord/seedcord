'use client';

import {
    Disclosure,
    DisclosureChevron,
    DisclosureTrigger,
    LabelSwap,
    cn,
    easeInOutStrong,
    easeOutStrong,
    tw,
    useDisclosure
} from '@seedcord/ui';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { idOf, indentOf, rowClassName } from './TableOfContents';

import type { TableOfContentsProps } from './TableOfContents';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { Variants } from 'motion/react';
import type { CSSProperties, ReactElement, RefObject } from 'react';

const barClassName = cn(
    tw`relative border-b border-(--border) bg-(--bg-navbar) backdrop-blur`,
    tw`transition-colors duration-150 ease-out`
);
// a transparent border holds the bar's height while the panel draws the visible edge
const barOpenClassName = tw`border-b-transparent`;
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
            // a page that fits the screen is already read through
            const read = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 1;
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

function PanelRows({
    items,
    active,
    onPick
}: {
    items: readonly TOCItemType[];
    active: ReadonlySet<string>;
    onPick: () => void;
}): ReactElement {
    return (
        <div
            className={cn('nice-scroll max-h-[50dvh] overflow-y-auto overscroll-contain px-4 py-3 text-[13px] md:px-6')}
        >
            {items.map((item) => {
                const isActive = active.has(idOf(item.url));
                return (
                    <a
                        key={item.url}
                        href={item.url}
                        onClick={onPick}
                        aria-current={isActive ? 'location' : undefined}
                        className={cn(
                            rowClassName,
                            tw`border-l`,
                            indentOf(item.depth),
                            isActive ? tw`border-(--flesh) text-(--flesh)` : tw`border-(--border) text-(--text-muted)`
                        )}
                    >
                        {item.title}
                    </a>
                );
            })}
        </div>
    );
}

function Panel({
    items,
    active,
    onPick
}: {
    items: readonly TOCItemType[];
    active: ReadonlySet<string>;
    onPick: () => void;
}): ReactElement {
    const { open, panelId } = useDisclosure();
    const reducedMotion = useReducedMotion() ?? false;

    return (
        <AnimatePresence>
            {open ? (
                <m.div
                    id={panelId}
                    variants={reducedMotion ? INSTANT : PANEL_MOTION}
                    initial="hidden"
                    animate="shown"
                    exit="gone"
                    className={cn(panelClassName, 'overflow-hidden')}
                >
                    <PanelRows items={items} active={active} onPick={onPick} />
                </m.div>
            ) : null}
        </AnimatePresence>
    );
}

export interface TocBarProps extends TableOfContentsProps {
    /** The heading that went active most recently. works in both scroll directions. */
    currentId: string | undefined;
    pageTitle: string;
}

export function TocBar({ items, activeIds, currentId, pageTitle, className }: TocBarProps): ReactElement {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const active = new Set(activeIds);
    const current = items.find((item) => idOf(item.url) === currentId);

    useReadProgress(ref);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent): void => {
            if (event.target instanceof Node && ref.current?.contains(event.target)) return;
            setOpen(false);
        };
        // the focused row unmounts, dropping focus to the body
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') return;
            setOpen(false);
            triggerRef.current?.focus();
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
                <DisclosureTrigger ref={triggerRef} className={cn(triggerHeight, 'gap-2 px-4 text-sm md:px-6')}>
                    <LabelSwap
                        active={open}
                        idleLabel={current?.title ?? pageTitle}
                        activeLabel={pageTitle}
                        itemClassName={cn('truncate text-left')}
                        className={cn('min-w-0 flex-1 text-(--text)')}
                    />
                    <DisclosureChevron />
                </DisclosureTrigger>
                {open ? null : <span aria-hidden className={cn(progressClassName)} style={progressStyle} />}
                <Panel items={items} active={active} onPick={() => setOpen(false)} />
            </Disclosure>
        </div>
    );
}
