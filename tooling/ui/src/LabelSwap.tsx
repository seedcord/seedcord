import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ReactElement, ReactNode } from 'react';

const cellClassName = cn(
    tw`col-start-1 row-start-1`,
    tw`transition-[opacity,translate,filter] duration-200 ease-(--ease-out-strong)`
);

const leavingUp = tw`opacity-0 blur-[2px] motion-safe:-translate-y-1`;
const waitingBelow = tw`opacity-0 blur-[2px] motion-safe:translate-y-1`;

export interface LabelSwapProps {
    active: boolean;
    idleLabel: ReactNode;
    activeLabel: ReactNode;
    /** Applied to both labels. */
    itemClassName?: string;
    activeClassName?: string;
    className?: string;
}

export function LabelSwap({
    active,
    idleLabel,
    activeLabel,
    itemClassName,
    activeClassName,
    className
}: LabelSwapProps): ReactElement {
    return (
        // both labels share one grid cell to keep the box at the wider one's width
        <span className={cn('grid', className)}>
            <span className={cn(cellClassName, itemClassName, active ? leavingUp : 'opacity-100')}>{idleLabel}</span>
            <span className={cn(cellClassName, itemClassName, activeClassName, active ? 'opacity-100' : waitingBelow)}>
                {activeLabel}
            </span>
        </span>
    );
}
