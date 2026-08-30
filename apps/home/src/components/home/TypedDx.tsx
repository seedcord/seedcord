import { cn, Icon } from '@seedcord/ui';
import { Braces, RefreshCw, ShieldCheck } from 'lucide-react';

import { CodeCard } from '#components/code/CodeCard';
import { SECTION_HEADING, Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { CODE_MARK_LIGHT } from '#lib/code/marks';
import { codegenOutput, typedDxCommand, typedDxHandler } from '#lib/code/samples';

import type { ReactNode } from 'react';

const BULLETS = [
    { icon: Braces, label: 'Choices become a literal union', note: "'books' | 'films'" },
    { icon: ShieldCheck, label: 'Required options are never null', note: 'use it directly' },
    { icon: RefreshCw, label: 'Getter signatures regenerate on change', note: '' }
] as const;

export function TypedDx(): ReactNode {
    return (
        <Section ground="pith">
            <div className={cn('grid items-start gap-x-10 gap-y-8 lg:grid-cols-[0.9fr_1.1fr]')}>
                <div className={cn('min-w-0 lg:col-start-1 lg:row-start-1')}>
                    <h2 className={cn(SECTION_HEADING)}>
                        The builder is the <span className={cn('text-(--flesh-deep)')}>source</span> of the types.
                    </h2>
                    <p className={cn('mt-6 max-w-md text-lg/snug font-medium text-(--seed-dark)/85')}>
                        You define options on the standard discord.js builder for slash commands or context menu
                        commands. <Code className={cn(CODE_MARK_LIGHT)}>seedcord codegen</Code> reads it and writes the
                        accessor types, so the builder stays the only schema you maintain.
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
                </div>
                <div className={cn('min-w-0 space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1')}>
                    <CodeCard code={typedDxCommand} filename="commands/search.ts" className={cn('rule blk-rind')} />
                    <CodeCard code={typedDxHandler} filename="handlers/search.ts" className={cn('rule blk-rind')} />
                </div>
                {/* moving this into the left column puts it before the builder on mobile */}
                <CodeCard
                    code={codegenOutput}
                    filename="seedcord-gen.d.ts"
                    note="automatically generated"
                    className={cn('rule blk-rind lg:col-start-1 lg:row-start-2')}
                />
            </div>
        </Section>
    );
}
