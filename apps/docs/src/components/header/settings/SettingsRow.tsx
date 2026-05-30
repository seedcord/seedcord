import { cn } from '@seedcord/ui';

import type { ReactNode } from 'react';

export function SettingsRow({
    title,
    subtitle,
    children
}: {
    title: string;
    subtitle?: string;
    children?: ReactNode;
}): React.ReactElement {
    return (
        <div className={cn('flex items-center justify-between gap-4 rounded-md p-2')}>
            <div className={cn('min-w-0')}>
                <div className={cn('text-sm font-medium text-(--text)')}>{title}</div>
                {subtitle ? <div className={cn('text-subtle text-xs')}>{subtitle}</div> : null}
            </div>

            <div className={cn('shrink-0')}>{children}</div>
        </div>
    );
}
