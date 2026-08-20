'use client';

import { cn, tw } from '@seedcord/ui';
import { LayoutGroup, m, useReducedMotion } from 'motion/react';
import { useId } from 'react';

import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactElement } from 'react';

export interface TableOfContentsProps {
    items: readonly TOCItemType[];
    activeIds: readonly string[];
    className?: string | undefined;
}

// 214px is the column the guide layouts mock drew
const columnClassName = tw`nice-scroll sticky w-53.5 shrink-0 self-start overflow-y-auto text-[13px]`;
export const labelClassName = tw`mb-2 text-xs font-semibold tracking-widest text-(--text-faint) uppercase`;
export const rowClassName = cn(tw`block py-1.5`, tw`transition-colors duration-100 ease-out`);

const TOP_LEVEL_DEPTH = 2;

export function idOf(url: string): string {
    return url.startsWith('#') ? url.slice(1) : url;
}

export function indentOf(depth: number): string {
    return depth > TOP_LEVEL_DEPTH ? tw`ps-6` : tw`ps-3`;
}

interface ActiveRange {
    start: number;
    end: number;
}

export function activeRangeOf(items: readonly TOCItemType[], active: ReadonlySet<string>): ActiveRange | null {
    let start = -1;
    let end = -1;

    for (const [index, item] of items.entries()) {
        if (!active.has(idOf(item.url))) continue;
        if (start === -1) start = index;
        end = index;
    }

    return start === -1 ? null : { start, end };
}

export function TableOfContents({ items, activeIds, className }: TableOfContentsProps): ReactElement {
    const reducedMotion = useReducedMotion() ?? false;
    const groupId = useId();
    const active = new Set(activeIds);
    const range = activeRangeOf(items, active);

    return (
        <LayoutGroup id={groupId}>
            <nav aria-label="On this page" className={cn(columnClassName, className)}>
                <p className={cn(labelClassName)}>On this page</p>
                {/* the grid sizes the marker to its row span */}
                <div className={cn('grid border-l border-(--border)')}>
                    {range ? (
                        <m.span
                            layout
                            aria-hidden
                            transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
                            style={{ gridRow: `${range.start + 1} / ${range.end + 2}`, gridColumn: 1 }}
                            className={cn('-ml-px w-0.5 justify-self-start bg-(--flesh)')}
                        />
                    ) : null}
                    {items.map((item, index) => {
                        const isActive = active.has(idOf(item.url));
                        return (
                            <a
                                key={item.url}
                                href={item.url}
                                aria-current={isActive ? 'location' : undefined}
                                style={{ gridRow: index + 1, gridColumn: 1 }}
                                className={cn(
                                    rowClassName,
                                    indentOf(item.depth),
                                    isActive ? tw`text-(--flesh)` : tw`text-(--text-muted) hover:text-(--text)`
                                )}
                            >
                                {item.title}
                            </a>
                        );
                    })}
                </div>
            </nav>
        </LayoutGroup>
    );
}
