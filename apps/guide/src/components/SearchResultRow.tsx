'use client';

import { Icon, SearchOption, cn, tw } from '@seedcord/ui';
import { ChevronRight, FileText, Hash } from 'lucide-react';

import { MatchedText } from './MatchedText';

import type { GuideResult, MatchTerms } from '@seedcord/docs-search';
import type { ReactElement } from 'react';

export const ROW_ICON = tw`text-subtle size-4 shrink-0`;
export const ROW_TEXT = tw`flex min-w-0 flex-1 flex-col gap-0.5`;
export const ROW_TITLE = tw`truncate font-medium`;
export const ROW_SUBTITLE = tw`text-subtle truncate text-xs`;

// a row with an excerpt matched on its text
const UNMARKED: readonly string[] = [];

export interface SearchResultRowProps {
    result: GuideResult;
    terms: MatchTerms;
    isActive: boolean;
    optionId: string;
    index: number;
    onSelect: (result: GuideResult) => void;
    onActivate: (index: number) => void;
}

export function SearchResultRow({
    result,
    terms,
    isActive,
    optionId,
    index,
    onSelect,
    onActivate
}: SearchResultRowProps): ReactElement {
    const { icon, title } =
        result.heading === undefined ? { icon: FileText, title: result.page } : { icon: Hash, title: result.heading };

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
                <MatchedText
                    text={title}
                    terms={result.excerpt === undefined ? terms.title : UNMARKED}
                    className={cn(ROW_TITLE)}
                />
                <span className={cn(ROW_SUBTITLE, 'flex items-center gap-1')}>
                    {result.tab}
                    {result.heading === undefined ? null : (
                        <>
                            <Icon icon={ChevronRight} size={12} aria-hidden />
                            {result.page}
                        </>
                    )}
                </span>
                {result.excerpt === undefined ? null : (
                    <MatchedText text={result.excerpt} terms={terms.text} className={cn(ROW_SUBTITLE)} />
                )}
            </div>
        </SearchOption>
    );
}
