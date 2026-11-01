'use client';

import { Icon, SearchOption, cn, tw } from '@seedcord/ui';
import { FileText, Hash } from 'lucide-react';

import type { GuideResult } from '@seedcord/docs-search';
import type { ReactElement } from 'react';

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
        <SearchOption
            id={optionId}
            href={result.url}
            label={title}
            isActive={isActive}
            onSelect={() => onSelect(result)}
            onActivate={() => onActivate(index)}
        >
            <Icon icon={icon} className={cn(ROW_ICON)} aria-hidden />
            <div className={cn(ROW_TEXT)}>
                <span className={cn(ROW_TITLE)}>{title}</span>
                <span className={cn(ROW_SUBTITLE)}>{subtitle}</span>
            </div>
        </SearchOption>
    );
}
