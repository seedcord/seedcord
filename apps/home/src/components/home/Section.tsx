import { cn, tw } from '@seedcord/ui';

import type { ReactNode } from 'react';

export type Ground = 'pith' | 'rind' | 'flesh' | 'ink';

// tailwind-merge groups text-[<length>] with leading-*, since text-lg/7 sets both. composing a size
// onto a shared base through cn() drops the leading. each size keeps its own complete string.
export const SECTION_HEADING = tw`font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight`;
export const SECTION_HEADING_LG = tw`font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] font-semibold tracking-tight`;

const GROUND: Record<Ground, string> = {
    pith: tw`bg-(--pith) text-(--seed-dark)`,
    rind: tw`bg-(--rind-deep) text-(--pith)`,
    flesh: tw`bg-(--flesh-deep) text-(--pith)`,
    ink: tw`bg-(--seed-dark) text-(--pith)`
};

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
        <section className={cn('border-b-[3px] border-(--seed-dark)', GROUND[ground])}>
            <div className={cn('mx-auto max-w-(--shell-max) px-5 py-14 lg:py-20', className)}>{children}</div>
        </section>
    );
}
