'use client';

import { Icon, SearchOption, cn, tw } from '@seedcord/ui';
import { ChevronRight, FileText, Hash } from 'lucide-react';
import { Fragment } from 'react';

import { MatchedText } from './MatchedText';

import type { GuideResult } from '@seedcord/docs-search';
import type { ReactElement } from 'react';

export const ROW_ICON = tw`text-subtle size-4 shrink-0`;
export const ROW_TEXT = tw`flex min-w-0 flex-1 flex-col gap-0.5`;
export const ROW_TITLE = tw`truncate font-medium`;
export const ROW_SUBTITLE = tw`text-subtle truncate text-xs`;

const UNMARKED: readonly string[] = [];

interface SearchResultRowProps {
    result: GuideResult;
    isActive: boolean;
    optionId: string;
    onSelect: (result: GuideResult) => void;
    onActivate: (result: GuideResult) => void;
}

export function SearchResultRow({
    result,
    isActive,
    optionId,
    onSelect,
    onActivate
}: SearchResultRowProps): ReactElement {
    const { icon, title, trail } =
        result.heading === undefined
            ? { icon: FileText, title: result.page, trail: [result.tab] }
            : { icon: Hash, title: result.heading, trail: [result.tab, result.page] };
    const [first, ...rest] = trail;

    return (
        <SearchOption
            id={optionId}
            href={result.url}
            label={[title, ...trail].join(', ')}
            isActive={isActive}
            onSelect={() => onSelect(result)}
            onActivate={() => onActivate(result)}
        >
            <Icon icon={icon} className={cn(ROW_ICON)} aria-hidden />
            <div className={cn(ROW_TEXT)}>
                <MatchedText
                    text={title}
                    terms={result.by === 'title' ? result.terms : UNMARKED}
                    className={cn(ROW_TITLE)}
                />
                <span className={cn(ROW_SUBTITLE, 'flex items-center gap-1')}>
                    {first}
                    {rest.map((crumb) => (
                        <Fragment key={crumb}>
                            <Icon icon={ChevronRight} size={12} aria-hidden />
                            {crumb}
                        </Fragment>
                    ))}
                </span>
                {result.by !== 'title' && result.excerpt !== undefined ? (
                    <MatchedText
                        text={result.excerpt}
                        terms={result.by === 'text' ? result.terms : UNMARKED}
                        className={cn(ROW_SUBTITLE)}
                    />
                ) : null}
            </div>
        </SearchOption>
    );
}
