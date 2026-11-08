import { cn, Icon, tw } from '@seedcord/ui';

import type { Ground } from '#components/home/Section';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Chip {
    icon: LucideIcon;
    label: string;
}

type ChipGround = Extract<Ground, 'flesh' | 'ink'>;

const FILL: Record<ChipGround, string> = {
    flesh: tw`bg-(--seed-dark)/30`,
    ink: tw`bg-(--pith)/10`
};

export function Chips({ items, ground }: { items: readonly Chip[]; ground: ChipGround }): ReactNode {
    return (
        <div className={cn('mt-6 flex flex-wrap gap-2')}>
            {items.map((chip) => (
                <span
                    key={chip.label}
                    className={cn(
                        'rule-pith font-mono-code flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-semibold',
                        FILL[ground]
                    )}
                >
                    <Icon icon={chip.icon} size={14} className={cn('shrink-0')} />
                    {chip.label}
                </span>
            ))}
        </div>
    );
}
