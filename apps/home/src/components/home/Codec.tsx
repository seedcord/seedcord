import { cn, Icon } from '@seedcord/ui';
import { ArrowLeftFromLine, ArrowRightFromLine } from 'lucide-react';

import { CodeCard } from '#components/code/CodeCard';
import { Section } from '#components/home/Section';
import { codecComponent, codecHandler } from '#lib/code/samples';

import type { ReactNode } from 'react';

const CHIPS = [
    { icon: ArrowRightFromLine, label: 'encode(values) to string' },
    { icon: ArrowLeftFromLine, label: 'decode(id) to typed values' }
] as const;

export function Codec(): ReactNode {
    return (
        <Section ground="flesh">
            <div className={cn('max-w-2xl')}>
                <h2
                    className={cn(
                        'font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight'
                    )}
                >
                    100 characters.
                    <br />
                    Packed by a
                    <br />
                    typed schema.
                </h2>
                <p className={cn('mt-6 max-w-md text-lg/snug font-medium text-(--pith)')}>
                    Discord limits a customId to 100 characters. The codec packs your fields so more state fits than a
                    joined string would, then decodes them back to exact, typed values.
                </p>
                <div className={cn('mt-7 flex flex-wrap gap-2')}>
                    {CHIPS.map((chip) => (
                        <span
                            key={chip.label}
                            className={cn(
                                'rule-pith font-mono-code flex items-center gap-2 rounded-sm bg-(--seed-dark)/30 px-3 py-1.5 text-xs font-semibold'
                            )}
                        >
                            <Icon icon={chip.icon} size={14} className={cn('shrink-0')} />
                            {chip.label}
                        </span>
                    ))}
                </div>
            </div>
            <div className={cn('mt-10 grid gap-5 lg:grid-cols-2')}>
                <CodeCard
                    code={codecComponent}
                    filename="components/role-picker.ts"
                    note="component"
                    className={cn('rule-pith blk-pith')}
                />
                <CodeCard
                    code={codecHandler}
                    filename="handlers/role-picker.ts"
                    note="select handler"
                    className={cn('rule-pith blk-pith')}
                />
            </div>
        </Section>
    );
}
