import { Card, cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

export function SidebarEmptyState({ className }: { className?: string }): ReactElement {
    return (
        <Card
            as="nav"
            size="none"
            aria-label="Library navigation"
            className={cn('bg-surface flex h-full flex-col p-4', className)}
        >
            <p className={cn('text-subtle text-sm')}>No packages available.</p>
        </Card>
    );
}
