import { cn } from '@seedcord/ui';
import { MousePointer2, Pointer } from 'lucide-react';

import type { ReactElement } from 'react';

const ROW = 'flex shrink-0 items-center gap-1 text-(--text-muted)';

export function HoverHint(): ReactElement {
    return (
        <>
            <span className={cn(ROW, '[@media(hover:none)]:hidden')}>
                <MousePointer2 aria-hidden className={cn('size-3')} />
                hover for types
            </span>
            <span className={cn(ROW, '[@media(hover:hover)]:hidden')}>
                <Pointer aria-hidden className={cn('size-3')} />
                tap for types
            </span>
            <span className={cn('sr-only')}>, arrow keys walk the tokens</span>
        </>
    );
}
