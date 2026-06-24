import { cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

function DocsLoading(): ReactElement {
    return (
        <output aria-label="Loading documentation" className={cn('block animate-pulse space-y-6 p-6')}>
            <div className={cn('space-y-3')}>
                <div className={cn('h-7 w-2/5 rounded-md bg-(--surface-moderate)')} />
                <div className={cn('h-4 w-3/5 rounded bg-(--surface-subtle)')} />
            </div>
            <div className={cn('h-32 rounded-md border border-(--border) bg-(--surface-subtle)')} />
            <div className={cn('space-y-2')}>
                <div className={cn('h-4 w-full rounded bg-(--surface-subtle)')} />
                <div className={cn('h-4 w-11/12 rounded bg-(--surface-subtle)')} />
                <div className={cn('h-4 w-3/4 rounded bg-(--surface-subtle)')} />
            </div>
            <span className={cn('sr-only')}>Loading…</span>
        </output>
    );
}

export default DocsLoading;
