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
            <div className={cn('border-b border-(--border) px-6 py-3')}>
                <Link
                    href="/dev"
                    className={cn(
                        'text-xs font-semibold tracking-widest text-(--text-faint) uppercase hover:text-(--text)'
                    )}
                >
                    ← guide · /dev
                </Link>
            </div>
            {children}
        </div>
    );
}

export default DevLayout;
