import { cn } from '@seedcord/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Dev playground: the guide shell',
    robots: { index: false, follow: false }
};

interface DevLayoutProps {
    children: ReactNode;
}

function DevLayout({ children }: DevLayoutProps): ReactNode {
    if (process.env.NODE_ENV !== 'development') notFound();

    return (
        <div className={cn('flex min-h-screen flex-col')}>
            {children}
            {/* fixed because the shell's navbar covers the top of the flow */}
            <Link
                href="/dev"
                className={cn(
                    'fixed bottom-4 left-4 z-70 rounded-md border border-(--border) bg-(--bg-popover) px-3 py-2',
                    'text-xs font-semibold tracking-widest text-(--text-faint) uppercase shadow-(--shadow-card-md)',
                    'hover:text-(--text)'
                )}
            >
                ← /dev
            </Link>
        </div>
    );
}

export default DevLayout;
