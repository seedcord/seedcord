import { Skeleton, cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

const GROUPS = ['classes', 'functions', 'types'] as const;
const ITEMS = ['a', 'b', 'c', 'd'] as const;

export function SidebarCategoryListSkeleton(): ReactElement {
    return (
        <div className={cn('space-y-6 p-1')}>
            {GROUPS.map((group) => (
                <div key={group} className={cn('space-y-2')}>
                    <Skeleton tone="moderate" className={cn('h-3 w-2/5')} />
                    {ITEMS.map((item) => (
                        <Skeleton key={`${group}-${item}`} className={cn('h-8 w-full rounded-md')} />
                    ))}
                </div>
            ))}
        </div>
    );
}
