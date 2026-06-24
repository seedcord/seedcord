import { Button, cn } from '@seedcord/ui';
import Link from 'next/link';

import type { ReactElement } from 'react';

export function NotFound(): ReactElement {
    return (
        <div className={cn('flex min-h-[60vh] items-center justify-center')}>
            <div className={cn('text-center')}>
                <h1 className={cn('text-6xl font-semibold')}>404</h1>
                <p className={cn('mt-2 text-xl')}>Not Found</p>
                <Button variant="secondary" asChild className={cn('mt-6')}>
                    <Link href="/">Go to docs</Link>
                </Button>
            </div>
        </div>
    );
}
