import { cn } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';

import type { ReactElement } from 'react';

interface SeedcordMarkProps {
    className?: string;
    textClassName?: string;
    showWordmark?: boolean;
}

export function SeedcordMark({ className, textClassName, showWordmark = true }: SeedcordMarkProps): ReactElement {
    return (
        <span className={cn('flex items-center gap-2 select-none', className)}>
            <Materwelon className={cn('drop-shadow-mark size-9')} />
            {showWordmark ? (
                <span className={cn('text-lg font-semibold tracking-tight text-(--text)', textClassName)}>
                    seedcord
                </span>
            ) : null}
        </span>
    );
}
