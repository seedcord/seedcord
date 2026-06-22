import { cn } from '@seedcord/ui';

import type { ReactNode } from 'react';

// one copy of the feature list; the strip renders two and slides the pair -50% for a seamless loop
function Track({ items }: { items: readonly string[] }): ReactNode {
    return (
        <ul className={cn('flex shrink-0 items-center')}>
            {items.map((feature, i) => (
                <li key={feature} className={cn('flex items-center')}>
                    <span className={cn('px-6 whitespace-nowrap')}>{feature}</span>
                    <span aria-hidden className={cn(i % 2 === 0 ? 'text-(--flesh)' : 'text-(--rind)', 'px-2')}>
                        ✦
                    </span>
                </li>
            ))}
        </ul>
    );
}

export function FeatureMarquee({ items }: { items: readonly string[] }): ReactNode {
    return (
        <div className={cn('marquee-mask overflow-hidden bg-(--seed-dark) text-(--cream)')}>
            <div className={cn('marquee-anim font-mono-code flex w-max py-2.5 text-sm font-semibold')}>
                <Track items={items} />
                <span aria-hidden className={cn('flex')}>
                    <Track items={items} />
                </span>
            </div>
        </div>
    );
}
