import { cn, Icon } from '@seedcord/ui';
import { Braces, RefreshCw, ShieldCheck } from 'lucide-react';

import { CodeCard } from '@components/code/CodeCard';
import { Eyebrow, Section } from '@components/home/Section';
import { codegenOutput, typedDxCommand, typedDxHandler } from '@lib/code/samples';

import type { ReactNode } from 'react';

const BULLETS = [
    { icon: Braces, label: 'Choices become a literal union', note: "'books' | 'films'" },
    { icon: ShieldCheck, label: 'Required options are never null', note: 'no ?? throw dance' },
    { icon: RefreshCw, label: 'Getter signatures regenerate on change', note: '' }
] as const;

export function TypedDx(): ReactNode {
    return (
        <Section ground="cream">
            <div className={cn('grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]')}>
                <div>
                    <Eyebrow ground="cream">01 / TYPED DX</Eyebrow>
                    <h2
                        className={cn(
                            'font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight'
                        )}
                    >
                        The builder is the <span className={cn('text-(--flesh)')}>source</span> of the types.
                    </h2>
                    <p className={cn('mt-6 max-w-md text-lg/snug font-medium text-(--seed-dark)/85')}>
                        You define options on the standard discord.js builder.{' '}
                        <code className={cn('font-mono-code text-[0.95em] text-(--flesh)')}>seedcord codegen</code>{' '}
                        reads it and writes the accessor types. No schema duplication, no manual generics.
                    </p>
                    <ul className={cn('mt-8 space-y-4')}>
                        {BULLETS.map((b) => (
                            <li key={b.label} className={cn('flex gap-3')}>
                                <Icon icon={b.icon} size={18} className={cn('mt-0.5 shrink-0 text-(--rind)')} />
                                <div>
                                    <p className={cn('font-medium')}>{b.label}</p>
                                    {b.note ? (
                                        <p className={cn('font-mono-code mt-0.5 text-sm text-(--seed-dark)/55')}>
                                            {b.note}
                                        </p>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <CodeCard
                        code={codegenOutput}
                        filename="seedcord-gen.d.ts"
                        note="generated"
                        className={cn('rule blk-rind mt-8')}
                    />
                </div>
                <div className={cn('space-y-5')}>
                    <CodeCard code={typedDxCommand} filename="commands/search.ts" className={cn('rule blk-rind')} />
                    <CodeCard code={typedDxHandler} filename="handlers/search.ts" className={cn('rule blk-rind')} />
                </div>
            </div>
        </Section>
    );
}
