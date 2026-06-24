import { cn, tw } from '@seedcord/ui';

import type { ReactNode } from 'react';

export type Ground = 'cream' | 'rind' | 'flesh' | 'ink';

const GROUND: Record<Ground, { section: string; eyebrow: string }> = {
    cream: { section: tw`bg-(--cream) text-(--seed-dark)`, eyebrow: tw`text-(--vine-deep)` },
    rind: { section: tw`bg-(--vine-deep) text-(--cream)`, eyebrow: tw`text-(--cream)` },
    flesh: { section: tw`bg-(--flesh-deep) text-(--cream)`, eyebrow: tw`text-(--cream)` },
    ink: { section: tw`bg-(--seed-dark) text-(--cream)`, eyebrow: tw`text-(--rind)` }
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
        <section className={cn('border-b-[3px] border-(--seed-dark)', GROUND[ground].section)}>
            <div className={cn('mx-auto max-w-7xl px-5 py-14 lg:py-20', className)}>{children}</div>
        </section>
    );
}

export function Eyebrow({ ground, children }: { ground: Ground; children: ReactNode }): ReactNode {
    return <p className={cn('font-mono-code mb-3 text-sm font-semibold', GROUND[ground].eyebrow)}>{children}</p>;
}
