import { cn } from '@seedcord/ui';

import { OverviewSkeleton } from '#components/docs/OverviewSkeleton';

import type { ReactElement } from 'react';

export default function OverviewLoading(): ReactElement {
    return (
        <output aria-label="Loading documentation" className={cn('block p-6')}>
            <OverviewSkeleton />
        </output>
    );
}
