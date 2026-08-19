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
            <span className={cn('font-display text-lg font-semibold tracking-tight text-(--text)')}>seedcord</span>
        </span>
    );
}
