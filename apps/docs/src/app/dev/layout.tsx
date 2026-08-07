import { cn } from '@seedcord/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Dev playground: @seedcord/ui',
    robots: { index: false, follow: false }
};

interface DevLayoutProps {
    children: ReactNode;
}

function DevLayout({ children }: DevLayoutProps): ReactNode {
    // dev-only, this 404s in production builds so the route doesn't ship
    if (process.env.NODE_ENV !== 'development') notFound();

    return (
        <div className={cn('min-h-[calc(100vh-4rem)]')}>
            <div className={cn('border-b border-(--border) px-6 py-3')}>
                <Link
                    href="/dev"
                    className={cn('text-subtle text-xs font-semibold tracking-widest uppercase hover:text-(--text)')}
                >
                    ← @seedcord/ui · /dev
                </Link>
            </div>
            <main className={cn('mx-auto max-w-5xl px-6 py-10')}>{children}</main>
        </div>
    );
}

export default DevLayout;
