import { cn } from '@lib/utils';

import type { ReactElement } from 'react';

function SidebarEmptyState({ className }: { className?: string }): ReactElement {
    return (
        <nav
            aria-label="Library navigation"
            className={cn('card bg-surface shadow-soft flex h-full flex-col p-4', className)}
        >
            <p className="text-subtle text-sm">No packages available.</p>
        </nav>
    );
}

export default SidebarEmptyState;
