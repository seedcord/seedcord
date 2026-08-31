'use client';

import { Icon, cn, tw } from '@seedcord/ui';
import { FileText, Hash, TextQuote } from 'lucide-react';

import { highlightSegments, matchWindow } from '#lib/searchHighlight';

import type { HighlightSegment } from '#lib/searchHighlight';
import type { IconComponent } from '@seedcord/ui';
import type { SortedResult } from 'fumadocs-core/search';
import type { ReactElement } from 'react';

// a text result is a paragraph, a table cell, or a code fence
const KIND_ICONS: Record<SortedResult['type'], IconComponent> = { page: FileText, heading: Hash, text: TextQuote };

const ACTIVE = tw`data-[active=true]:border-(--rind)/38 data-[active=true]:bg-(--rind)/16`;

// 24 chars of lead keeps the match near the left where a reader looks first
const LEAD = 24;
const WIDTH = 150;

// one result can mark the same word twice. the text alone would collide as a key
function keyed(segments: readonly HighlightSegment[]): { key: string; segment: HighlightSegment }[] {
    let at = 0;

    return segments.map((segment) => {
        const key = `${String(at)}-${segment.text}`;
        at += segment.text.length;
        return { key, segment };
    });
}

export interface SearchResultRowProps {
    result: SortedResult;
    isActive: boolean;
    optionId: string;
    index: number;
    onSelect: (result: SortedResult) => void;
    onActivate: (index: number) => void;
}

export function SearchResultRow({
    result,
    isActive,
    optionId,
    index,
    onSelect,
    onActivate
}: SearchResultRowProps): ReactElement {
    const isPage = result.type === 'page';
    const segments = matchWindow(highlightSegments(result.content), LEAD, WIDTH);

    return (
        <div
            id={optionId}
            role="option"
            aria-selected={isActive}
            data-active={isActive || undefined}
            onClick={() => onSelect(result)}
            onMouseMove={() => onActivate(index)}
            className={cn(
                'group/row mt-1 flex cursor-pointer items-center gap-3 rounded-md border border-transparent',
                'p-3 text-sm text-(--text) outline-hidden transition first:mt-0',
                // scrollIntoView block:'nearest' stops at this margin, keeping the list's own padding
                'scroll-my-3',
                isPage ? null : tw`ms-4`,
                ACTIVE
            )}
        >
            <Icon icon={KIND_ICONS[result.type]} size={16} className={cn('text-subtle shrink-0')} aria-hidden />
            <div className={cn('flex min-w-0 flex-1 flex-col gap-0.5')}>
                <span className={cn('truncate', isPage ? tw`font-medium` : tw`text-(--text-muted)`)}>
                    {keyed(segments).map(({ key, segment }) => {
                        const Tag = segment.match ? 'mark' : 'span';
                        return (
                            <Tag
                                key={key}
                                className={cn(
                                    segment.match ? tw`bg-(--rind)/25 text-(--text)` : null,
                                    segment.code ? tw`font-mono text-[0.9em]` : null
                                )}
                            >
                                {segment.text}
                            </Tag>
                        );
                    })}
                </span>
                {isPage ? <span className={cn('text-subtle truncate font-mono text-xs')}>{result.url}</span> : null}
            </div>
        </div>
    );
}
