'use client';

import { Icon, cn, tw } from '@seedcord/ui';
import { FileText, Hash } from 'lucide-react';

import type { GuideResult } from '@seedcord/docs-search';
import type { ReactElement } from 'react';

const ACTIVE = tw`data-[active=true]:border-(--rind)/38 data-[active=true]:bg-(--rind)/16`;

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
                'group/row mt-1 flex cursor-pointer items-center gap-3 rounded-md border border-transparent',
                'p-3 text-sm text-(--text) outline-hidden transition first:mt-0',
                // scrollIntoView block:'nearest' stops at this margin, keeping the list's own padding
                'scroll-my-3',
                ACTIVE
            )}
        >
            <Icon icon={icon} size={16} className={cn('text-subtle shrink-0')} aria-hidden />
            <div className={cn('flex min-w-0 flex-1 flex-col gap-0.5')}>
                <span className={cn('truncate font-medium')}>{title}</span>
                <span className={cn('text-subtle truncate text-xs')}>{subtitle}</span>
            </div>
        </div>
    );
}
