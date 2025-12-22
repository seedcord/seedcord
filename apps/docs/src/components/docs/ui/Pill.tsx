import { cn } from '../../../lib/utils';

import type { ReactNode, ReactElement } from 'react';

function Pill({ className, children }: { className?: string; children: ReactNode }): ReactElement {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase',
                className
            )}
        >
            {children}
        </span>
    );
}

export default Pill;
