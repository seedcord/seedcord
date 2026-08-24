import { cn } from './lib/cn';
import { Materwelon } from './Materwelon';

import type { ReactElement } from 'react';

export interface SiteMarkProps {
    className?: string | undefined;
}

export function SiteMark({ className }: SiteMarkProps): ReactElement {
    return (
        <span className={cn('flex items-center gap-2.5 select-none', className)}>
            <Materwelon className={cn('drop-shadow-mark size-7')} />
            {/* four icons and the wordmark overflow the bar at 390 */}
            <span className={cn('font-display hidden text-lg font-semibold tracking-tight text-(--text) sm:inline')}>
                seedcord
            </span>
        </span>
    );
}
