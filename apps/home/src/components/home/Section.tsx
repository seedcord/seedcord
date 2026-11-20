import { cn, tw } from '@seedcord/ui';

import type { ReactNode } from 'react';

export type Ground = 'pith' | 'rind' | 'flesh' | 'ink';

// cn groups text-[<length>] with leading-* since text-lg/7 sets both. composing a size
// onto a shared base through cn() loses the leading. each size keeps its own complete string.
export const SECTION_HEADING = tw`font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight`;
export const SECTION_HEADING_LG = tw`font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] font-semibold tracking-tight`;

const GROUND: Record<Ground, string> = {
    pith: tw`bg-(--pith) text-(--seed-dark)`,
    rind: tw`bg-(--rind-deep) text-(--pith)`,
    flesh: tw`bg-(--flesh-deep) text-(--pith)`,
    // the dark rule can't show against ink. ink covers the one above it with a cream rule
    ink: tw`relative -mt-0.75 border-t-[3px] border-t-(--pith) bg-(--seed-dark) text-(--pith)`
};

const AFTER_INK = tw`[[data-ground=ink]+&]:border-t-[3px] [[data-ground=ink]+&]:border-t-(--pith)`;

export function Section({
    ground,
    className,
    children
}: {
    ground: Ground;
    className?: string;
    children: ReactNode;
}): ReactNode {
    return (
        <section data-ground={ground} className={cn('border-b-[3px] border-(--seed-dark)', AFTER_INK, GROUND[ground])}>
            <div className={cn('mx-auto max-w-(--shell-max) px-5 py-14 lg:py-20', className)}>{children}</div>
        </section>
    );
}
