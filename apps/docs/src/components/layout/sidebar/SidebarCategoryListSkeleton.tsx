import { cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

const GROUPS = ['classes', 'functions', 'types'] as const;
const ITEMS = ['a', 'b', 'c', 'd'] as const;

export function SidebarCategoryListSkeleton(): ReactElement {
    return (
        <div className={cn('animate-pulse space-y-6 p-1')} aria-hidden>
            {GROUPS.map((group) => (
                <div key={group} className={cn('space-y-2')}>
                    <div className={cn('h-3 w-2/5 rounded bg-(--surface-moderate)')} />
                    {ITEMS.map((item) => (
                        <div key={`${group}-${item}`} className={cn('h-8 w-full rounded-md bg-(--surface-subtle)')} />
                    ))}
                </div>
            ))}
        </div>
    );
}
