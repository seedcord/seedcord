'use client';

import { Icon, cn, tw } from '@seedcord/ui';
import { FileText, Hash } from 'lucide-react';

import type { GuideResult } from '@seedcord/docs-search';
import type { ReactElement } from 'react';

const ACTIVE = tw`data-[active=true]:border-(--rind)/38 data-[active=true]:bg-(--rind)/16`;

export const ROW_BOX = tw`mt-1 flex items-center gap-3 rounded-md border border-transparent p-3 text-sm first:mt-0`;
export const ROW_ICON = tw`text-subtle size-4 shrink-0`;
export const ROW_TEXT = tw`flex min-w-0 flex-1 flex-col gap-0.5`;
export const ROW_TITLE = tw`truncate font-medium`;
export const ROW_SUBTITLE = tw`text-subtle truncate text-xs`;

export interface SearchResultRowProps {
    result: GuideResult;
    isActive: boolean;
    optionId: string;
    index: number;
    onSelect: (result: GuideResult) => void;
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
    const { icon, title, subtitle } =
        result.heading === undefined
            ? { icon: FileText, title: result.page, subtitle: result.path }
            : { icon: Hash, title: result.heading, subtitle: result.page };

    return (
        <div
            id={optionId}
            role="option"
            aria-selected={isActive}
            data-active={isActive || undefined}
            onClick={() => onSelect(result)}
            onMouseMove={() => onActivate(index)}
            className={cn(
                ROW_BOX,
                'group/row cursor-pointer text-(--text) outline-hidden transition',
                // scrollIntoView block:'nearest' stops at this margin, keeping the list's own padding
                'scroll-my-3',
                ACTIVE
            )}
        >
            <Icon icon={icon} className={cn(ROW_ICON)} aria-hidden />
            <div className={cn(ROW_TEXT)}>
                <span className={cn(ROW_TITLE)}>{title}</span>
                <span className={cn(ROW_SUBTITLE)}>{subtitle}</span>
            </div>
        </div>
    );
}
