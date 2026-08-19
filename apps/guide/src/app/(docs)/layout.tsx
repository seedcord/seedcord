import { cn } from '@seedcord/ui';

import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }): ReactNode {
    return <main className={cn('mx-auto w-full max-w-3xl px-6 py-16')}>{children}</main>;
}
