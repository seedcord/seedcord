import { cn } from '@seedcord/ui';

import { CodeCard } from '#components/code/CodeCard';
import { SECTION_HEADING, Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { CODE_MARK_DARK } from '#lib/code/marks';
import { gatesSample } from '#lib/code/samples';

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
                    <h2 className={cn(SECTION_HEADING)}>
                        Compose the guards.
                        <br />
                        The compiler checks.
                    </h2>
                    <p className={cn('mt-6 max-w-md text-lg/snug font-medium text-(--pith)')}>
                        Stack <Code className={cn(CODE_MARK_DARK)}>@Gated</Code> guards on a handler and combine them
                        with <Code className={cn(CODE_MARK_DARK)}>and()</Code> and{' '}
                        <Code className={cn(CODE_MARK_DARK)}>or()</Code>. Guild, owner, role, permission and cooldown
                        each run at runtime, before your handler does. Attach one to the wrong handler kind and it fails
                        to compile.
                    </p>
                    <p className={cn('mt-4 max-w-md text-lg/snug font-medium text-(--pith)')}>
                        A refusal answers the user on its own, with a message you write once beside the check. Everyday
                        refusals stay out of your logs, and the ones you mark as faults get logged and reported.
                    </p>
                    <div className={cn('mt-7 flex flex-wrap gap-2')}>
                        {CHIPS.map((chip) => (
                            <span
                                key={chip.combinator}
                                className={cn(
                                    'rule-pith font-mono-code rounded-sm bg-(--seed-dark)/30 px-3 py-1.5 text-xs font-semibold'
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
                    className={cn('rule-pith blk-pith')}
                />
            </div>
        </Section>
    );
}
