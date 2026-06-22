import { cn, tw } from '@seedcord/ui';

import type { ReactNode } from 'react';

export type Ground = 'ink' | 'cream';

// surface classes per ground. ink sections also set data-theme=dark (see Section) so @seedcord/ui
// primitives resolve cream text, while the bespoke ground stays warm via the explicit --ink token.
export const GROUND: Record<Ground, { section: string; text: string; eyebrow: string; panel: string; file: string }> = {
    ink: {
        section: tw`bg-(--ink)`,
        text: tw`text-(--cream-dim)`,
        eyebrow: tw`text-(--husk)`,
        panel: tw`border-white/10 bg-(--clay)`,
        file: tw`text-(--husk)`
    },
    cream: {
        section: tw`bg-(--cream)`,
        text: tw`text-(--seed-dark)`,
        eyebrow: tw`text-(--seed-dark)/60`,
        panel: tw`border-black/10 bg-(--husk-cream)`,
        file: tw`text-(--seed-dark)/55`
    }
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
        <section
            data-theme={ground === 'ink' ? 'dark' : undefined}
            className={cn('grain relative overflow-hidden px-6 py-12 sm:py-16', GROUND[ground].section, className)}
        >
            <div className={cn('relative z-10 mx-auto w-full max-w-3xl', GROUND[ground].text)}>{children}</div>
        </section>
    );
}

export function Eyebrow({ ground, children }: { ground: Ground; children: ReactNode }): ReactNode {
    return (
        <p className={cn('font-mono-code text-[11px] tracking-[0.2em] uppercase', GROUND[ground].eyebrow)}>
            {children}
        </p>
    );
}
