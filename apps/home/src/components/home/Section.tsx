import { cn, tw } from '@seedcord/ui';

import type { ReactNode } from 'react';

export type Ground = 'pith' | 'rind' | 'flesh' | 'ink';

const GROUND: Record<Ground, string> = {
    pith: tw`bg-(--pith) text-(--seed-dark)`,
    rind: tw`bg-(--vine-deep) text-(--pith)`,
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
            <div className={cn('mx-auto max-w-7xl px-5 py-14 lg:py-20', className)}>{children}</div>
        </section>
    );
}
