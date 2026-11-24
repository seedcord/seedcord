import { cn, Icon, PosterSection, SECTION_HEADING } from '@seedcord/ui';
import { Braces, RefreshCw, ShieldCheck } from 'lucide-react';

import { CodeCard } from '#components/code/CodeCard';
import { Thread } from '#components/home/Thread';
import { Code } from '#components/ui/Code';
import { CODE_MARK_LIGHT } from '#lib/code/marks';
import { codegenOutput, typedDxCommand, typedDxHandler } from '#lib/code/samples';

import type { ReactNode } from 'react';

const BULLETS = [
    { icon: Braces, label: 'Choices become a literal union', note: 'You never typed that union.' },
    { icon: ShieldCheck, label: 'Required options are never null', note: 'Use the value without a check.' },
    { icon: RefreshCw, label: 'The types follow the builder', note: 'Codegen runs again when it changes.' }
] as const;

const CHOICES = ["'books'", "'films'"] as const;

export function TypedDx(): ReactNode {
    return (
        <PosterSection ground="pith">
            <div className={cn('grid items-start gap-x-10 gap-y-6 lg:grid-cols-2')}>
                <h2 className={cn(SECTION_HEADING)}>
                    The builder is the <span className={cn('text-(--flesh-deep)')}>source</span> of the types.
                </h2>
                <p className={cn('min-w-0 text-lg/snug font-medium text-(--seed-dark)/85')}>
                    You define options on the standard discord.js builder for slash commands or context menu commands.{' '}
                    <Code className={cn(CODE_MARK_LIGHT)}>seedcord codegen</Code> reads it and writes the accessor
                    types, so the builder stays the only schema you maintain.
                </p>
            </div>
            <Thread terms={CHOICES} className={cn('mt-10 grid gap-x-10 gap-y-5 lg:grid-cols-2')}>
                <div className={cn('flex min-w-0 flex-col gap-5')}>
                    <CodeCard
                        code={typedDxCommand}
                        filename="commands/search.ts"
                        note="you write this"
                        className={cn('blk-rind rule')}
                    />
                    <ul
                        className={cn(
                            'grid divide-(--seed-dark) max-lg:order-first max-md:mb-3 max-md:gap-4 md:blk-rind md:grid-cols-3 md:divide-x-[3px] md:rounded-sm md:rule lg:flex-1'
                        )}
                    >
                        {BULLETS.map((b) => (
                            <li key={b.label} className={cn('max-lg:flex max-lg:gap-3 md:p-4')}>
                                <Icon
                                    icon={b.icon}
                                    size={18}
                                    className={cn('mt-0.5 shrink-0 text-(--rind-deep) lg:float-left lg:mr-2')}
                                />
                                <div>
                                    <p className={cn('leading-snug font-semibold')}>{b.label}</p>
                                    <p className={cn('mt-1.5 text-sm text-(--seed-dark)/70')}>{b.note}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className={cn('min-w-0 space-y-5')}>
                    <CodeCard
                        code={codegenOutput}
                        filename="seedcord-gen.ts"
                        note="codegen writes this"
                        className={cn('blk-rind rule')}
                    />
                    <CodeCard
                        code={typedDxHandler}
                        filename="handlers/search.ts"
                        note="your handler gets this"
                        className={cn('blk-rind rule')}
                    />
                </div>
            </Thread>
        </PosterSection>
    );
}
