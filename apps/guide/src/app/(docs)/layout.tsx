import { cn } from '@seedcord/ui';

import type { ReactNode } from 'react';

// a placeholder until the real shell arrives with the shared navbar
export default function Layout({ children }: { children: ReactNode }): ReactNode {
    return <main className={cn('mx-auto w-full max-w-3xl px-6 py-16')}>{children}</main>;
}
