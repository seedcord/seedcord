import { cn } from '@seedcord/ui';

import type { ReactNode } from 'react';

export function Code({ children, className }: { children: ReactNode; className?: string }): ReactNode {
    return <code className={cn('font-mono-code', className)}>{children}</code>;
}
