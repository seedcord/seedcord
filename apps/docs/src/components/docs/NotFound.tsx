import { cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

function NotFound(): ReactElement {
    return (
        <div className={cn('flex min-h-[60vh] items-center justify-center')}>
            <div className={cn('text-center')}>
                <h1 className={cn('text-6xl font-semibold')}>404</h1>
                <p className={cn('mt-2 text-xl')}>Not Found</p>
            </div>
        </div>
    );
}

export default NotFound;
