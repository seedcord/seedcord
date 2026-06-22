import { cn, Icon } from '@seedcord/ui';
import { ArrowLeftFromLine, ArrowRightFromLine } from 'lucide-react';

import { CodeCard } from '@components/code/CodeCard';
import { Eyebrow, Section } from '@components/home/Section';
import { codecSample } from '@lib/code/samples';

import type { ReactNode } from 'react';

const CHIPS = [
    { icon: ArrowRightFromLine, label: 'encode(state) to string' },
    { icon: ArrowLeftFromLine, label: 'decode(id) to typed state' }
] as const;

export function Codec(): ReactNode {
    return (
        <Section ground="flesh">
            <div className={cn('grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]')}>
                <div>
                    <Eyebrow ground="flesh">03 / TYPED CUSTOMID CODEC</Eyebrow>
                    <h2
                        className={cn(
                            'font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight'
                        )}
                    >
                        100 characters.
                        <br />
                        A real schema,
                        <br />
                        not string slicing.
                    </h2>
                    <p className={cn('mt-6 max-w-md text-lg/snug font-medium text-(--cream)/90')}>
                        Discord limits a customId to 100 characters. The codec packs your fields so more state fits than
                        a joined string would, then decodes back to exact types. No split chains, no parseInt guessing.
                    </p>
                    <div className={cn('mt-7 flex flex-wrap gap-2')}>
                        {CHIPS.map((chip) => (
                            <span
                                key={chip.label}
                                className={cn(
                                    'rule-cream font-mono-code flex items-center gap-2 rounded-sm bg-(--seed-dark)/30 px-3 py-1.5 text-xs font-semibold'
                                )}
                            >
                                <Icon icon={chip.icon} size={14} className={cn('shrink-0')} />
                                {chip.label}
                            </span>
                        ))}
                    </div>
                </div>
                <CodeCard
                    code={codecSample}
                    filename="paginate.ts"
                    note="customId codec"
                    className={cn('rule-cream blk-cream')}
                />
            </div>
        </Section>
    );
}
