import { cn } from '@seedcord/ui';

import { CodeCard } from '@components/code/CodeCard';
import { Eyebrow, Section } from '@components/home/Section';
import { Code } from '@components/ui/Code';
import { gatesSample } from '@lib/code/samples';

import type { ReactNode } from 'react';

const CHIPS = [
    { combinator: 'and()', note: 'every arm passes' },
    { combinator: 'or()', note: 'any one arm passes' }
] as const;

export function Gates(): ReactNode {
    return (
        <Section ground="rind">
            <div className={cn('grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]')}>
                <div>
                    <Eyebrow ground="rind">04 / COMPOSABLE GATES</Eyebrow>
                    <h2
                        className={cn(
                            'font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight'
                        )}
                    >
                        Compose the guards.
                        <br />
                        The compiler checks.
                    </h2>
                    <p className={cn('mt-6 max-w-md text-lg/snug font-medium text-(--cream)')}>
                        Stack <Code>@Gated</Code> guards on a handler and combine them with <Code>and()</Code> and{' '}
                        <Code>or()</Code>. Guild, owner, role, permission and cooldown each run at runtime, before your
                        handler does. Attaching one to the wrong handler kind is a compile error.
                    </p>
                    <div className={cn('mt-7 flex flex-wrap gap-2')}>
                        {CHIPS.map((chip) => (
                            <span
                                key={chip.combinator}
                                className={cn(
                                    'rule-cream font-mono-code rounded-sm bg-(--seed-dark)/30 px-3 py-1.5 text-xs font-semibold'
                                )}
                            >
                                {chip.combinator} {chip.note}
                            </span>
                        ))}
                    </div>
                </div>
                <CodeCard
                    code={gatesSample}
                    filename="handlers/ban.ts"
                    note="composable gates"
                    className={cn('rule-cream blk-cream')}
                />
            </div>
        </Section>
    );
}
