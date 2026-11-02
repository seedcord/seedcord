import { SEARCH_OPTION_BOX, Skeleton, cn } from '@seedcord/ui';

import { ROW_ICON, ROW_SUBTITLE, ROW_TEXT, ROW_TITLE } from './SearchResultRow';

import type { ReactElement } from 'react';

const ROWS = [
    { id: 'first', title: 'w-2/5', subtitle: 'w-1/4' },
    { id: 'second', title: 'w-1/2', subtitle: 'w-1/3' },
    { id: 'third', title: 'w-1/3', subtitle: 'w-1/5' }
] as const;

export function SearchResultsSkeleton(): ReactElement {
    return (
        <>
            {ROWS.map((row) => (
                <div key={row.id} className={cn(SEARCH_OPTION_BOX)}>
                    <Skeleton className={cn(ROW_ICON)} />
                    <div className={cn(ROW_TEXT)}>
                        <div className={cn(ROW_TITLE, 'flex h-lh items-center')}>
                            <Skeleton tone="moderate" className={cn('h-3', row.title)} />
                        </div>
                        <div className={cn(ROW_SUBTITLE, 'flex h-lh items-center')}>
                            <Skeleton className={cn('h-2.5', row.subtitle)} />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
