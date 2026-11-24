import { cn, NotFound as NotFoundBody } from '@seedcord/ui';
import Link from 'next/link';

import type { ReactElement } from 'react';

export function NotFound(): ReactElement {
    return (
        <div className={cn('flex min-h-[60vh] items-center justify-center py-20')}>
            <NotFoundBody>
                <Link href="/">Back to the docs</Link>
            </NotFoundBody>
        </div>
    );
}
