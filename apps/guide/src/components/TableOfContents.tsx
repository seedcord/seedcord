'use client';

import { cn, tw } from '@seedcord/ui';
import { m, useReducedMotion } from 'motion/react';
import { useId, useLayoutEffect, useRef, useState } from 'react';

import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactElement, RefObject } from 'react';

export interface TableOfContentsProps {
    items: readonly TOCItemType[];
    activeIds: ReadonlySet<string>;
    className?: string | undefined;
}

// GuideShell's ContentsColumn sets the width and the sticky offset
const columnClassName = tw`nice-scroll overflow-y-auto text-[13px]`;
const labelClassName = tw`mb-2 text-xs font-semibold tracking-widest text-(--text-faint) uppercase`;
const rowClassName = cn(
    tw`block py-1.5`,
    tw`transition-colors duration-100 ease-out`,
    tw`focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-outline-b)`
);

const TOP_LEVEL_DEPTH = 2;
// remarkHeadingRange throws on anything outside h2 through h4
const INDENT_BY_DEPTH = [tw`ps-3`, tw`ps-5`, tw`ps-7`] as const;
// the gap between neighbouring INDENT_BY_DEPTH classes
const INDENT_STEP_PX = 8;
const SLIDE_SECONDS = 0.2;

export function idOf(url: string): string {
    return url.startsWith('#') ? url.slice(1) : url;
}

function levelOf(depth: number): number {
    return Math.min(Math.max(depth - TOP_LEVEL_DEPTH, 0), INDENT_BY_DEPTH.length - 1);
}

interface RowSpan {
    top: number;
    bottom: number;
}

interface Rail {
    rows: readonly RowSpan[];
    radius: number;
}

const NO_RAIL: Rail = { rows: [], radius: 0 };

// a straight line down, with a 45 degree slant into each row that sits at a different indent
function railPathOf(items: readonly TOCItemType[], { rows, radius }: Rail): string {
    const xs = items.map((item) => levelOf(item.depth) * INDENT_STEP_PX);
    const cut = radius * Math.SQRT1_2;
    const commands = [`M${xs[0] ?? 0} ${rows[0]?.top ?? 0}`];

    for (const [index, { top }] of rows.entries()) {
        const from = xs[index - 1];
        const to = xs[index] ?? 0;
        if (from === undefined || from === to) continue;

        const toward = Math.sign(to - from);
        const slantEnd = top + Math.abs(to - from);
        commands.push(
            `V${top - radius}`,
            `Q${from} ${top} ${from + toward * cut} ${top + cut}`,
            `L${to - toward * cut} ${slantEnd - cut}`,
            `Q${to} ${slantEnd} ${to} ${slantEnd + radius}`
        );
    }

    commands.push(`V${rows.at(-1)?.bottom ?? 0}`);
    return commands.join(' ');
}

function useRail(items: readonly TOCItemType[]): [RefObject<HTMLDivElement | null>, Rail] {
    const listRef = useRef<HTMLDivElement>(null);
    const [rail, setRail] = useState<Rail>(NO_RAIL);

    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;

        // fires once on observe, then whenever a title wraps
        const observer = new ResizeObserver(() => {
            setRail({
                rows: Array.from(list.querySelectorAll('a'), (row) => ({
                    top: row.offsetTop,
                    bottom: row.offsetTop + row.offsetHeight
                })),
                radius: Number.parseFloat(getComputedStyle(list).borderTopLeftRadius)
            });
        });
        observer.observe(list);
        return () => observer.disconnect();
    }, [items]);

    return [listRef, rail];
}

export interface TocRowsProps {
    items: readonly TOCItemType[];
    activeIds: ReadonlySet<string>;
    onPick?: (() => void) | undefined;
}

export function TocRows({ items, activeIds, onPick }: TocRowsProps): ReactElement {
    const reducedMotion = useReducedMotion() ?? false;
    // url(#id) breaks on the punctuation react puts in these ids
    const clipId = `toc-marker-${useId().replaceAll(/[^\w-]/g, '')}`;
    const [listRef, rail] = useRail(items);

    const activeRows = rail.rows.filter((_, index) => activeIds.has(idOf(items[index]?.url ?? '')));
    const first = activeRows.at(0);
    const last = activeRows.at(-1);
    const railPath = railPathOf(items, rail);

    return (
        <div className={cn('relative')}>
            {rail.rows.length > 0 ? (
                <svg aria-hidden className={cn('pointer-events-none absolute inset-0 size-full overflow-visible')}>
                    {/* the scrolling nav clips everything left of 0, where half of a 2px stroke at 0.5 would draw */}
                    <g fill="none" transform="translate(1.5 0)">
                        <path d={railPath} stroke="var(--border)" strokeWidth={1} />
                        {first && last ? (
                            <>
                                <clipPath id={clipId}>
                                    <m.rect
                                        x={-INDENT_STEP_PX}
                                        width={(INDENT_BY_DEPTH.length + 1) * INDENT_STEP_PX}
                                        initial={false}
                                        animate={{ attrY: first.top, height: last.bottom - first.top }}
                                        transition={{ duration: reducedMotion ? 0 : SLIDE_SECONDS }}
                                    />
                                </clipPath>
                                <path d={railPath} stroke="var(--flesh)" strokeWidth={2} clipPath={`url(#${clipId})`} />
                            </>
                        ) : null}
                    </g>
                </svg>
            ) : null}
            {/* useRail reads the corner radius off rounded-xs */}
            <div ref={listRef} className={cn('rounded-xs')}>
                {items.map((item) => {
                    const isActive = activeIds.has(idOf(item.url));
                    return (
                        <a
                            key={item.url}
                            href={item.url}
                            onClick={onPick}
                            aria-current={isActive ? 'location' : undefined}
                            className={cn(
                                rowClassName,
                                INDENT_BY_DEPTH[levelOf(item.depth)],
                                isActive ? tw`text-(--flesh)` : tw`text-(--text-muted) hover:text-(--text)`
                            )}
                        >
                            {item.title}
                        </a>
                    );
                })}
            </div>
        </div>
    );
}

export function TableOfContents({ items, activeIds, className }: TableOfContentsProps): ReactElement {
    return (
        <nav aria-label="On this page" className={cn(columnClassName, className)}>
            <p className={cn(labelClassName)}>On this page</p>
            <TocRows items={items} activeIds={activeIds} />
        </nav>
    );
}
