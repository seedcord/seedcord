'use client';

import { Disclosure, DisclosureChevron, DisclosurePanel, DisclosureTrigger, cn, tw } from '@seedcord/ui';
import { useEffect, useRef, useState } from 'react';

import { activeRangeOf, idOf, indentOf, rowClassName } from './TableOfContents';

import type { TableOfContentsProps } from './TableOfContents';
import type { ReactElement } from 'react';

const barClassName = tw`relative border-b border-(--border) bg-(--bg-navbar) backdrop-blur`;
const eyebrowClassName = tw`shrink-0 text-xs font-semibold tracking-wide text-(--text-faint) uppercase`;
// 44px, the tap-target floor
const triggerHeight = tw`h-11`;

const panelClassName = cn(
    tw`absolute inset-x-0 top-full`,
    tw`border-b border-(--border) bg-(--bg-navbar) shadow-(--shadow-card-md)`
);

export function TocBar({ items, activeIds, className }: TableOfContentsProps): ReactElement {
    const [open, setOpen] = useState(false);
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
            <Disclosure open={open} onOpenChange={setOpen} className={cn(barClassName)}>
                <DisclosureTrigger className={cn(triggerHeight, 'gap-2 px-4 text-sm md:px-6')}>
                    <span className={cn(eyebrowClassName)}>On this page</span>
                    <span aria-hidden className={cn('shrink-0 text-(--text-faint)')}>
                        /
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate text-left text-(--text)')}>{current?.title}</span>
                    <DisclosureChevron />
                </DisclosureTrigger>
                <DisclosurePanel className={cn(panelClassName)}>
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
                </DisclosurePanel>
            </Disclosure>
        </div>
    );
}
