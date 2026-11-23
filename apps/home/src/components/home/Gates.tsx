import { cn } from '@seedcord/ui';

import { CodeCard } from '#components/code/CodeCard';
import { GateEvaluator } from '#components/home/GateEvaluator';
import { SECTION_HEADING, Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { CODE_MARK_DARK } from '#lib/code/marks';
import { gatesSample } from '#lib/code/samples';

import type { ReactNode } from 'react';

export function Gates(): ReactNode {
    return (
        <Section ground="rind">
            <GateEvaluator
                card={
                    <CodeCard
                        code={gatesSample}
                        filename="handlers/ban.ts"
                        note="composable gates"
                        className={cn('blk-pith rule')}
                    />
                }
            >
                <h2 className={cn(SECTION_HEADING)}>
                    Compose the guards.
                    <br />
                    The compiler checks.
                </h2>
                <p className={cn('mt-6 max-w-md text-lg/snug font-medium text-(--pith)')}>
                    Stack <Code className={cn(CODE_MARK_DARK)}>@Gated</Code> guards on a handler and combine them with{' '}
                    <Code className={cn(CODE_MARK_DARK)}>and()</Code> and{' '}
                    <Code className={cn(CODE_MARK_DARK)}>or()</Code>. Guild, owner, role, permission and cooldown each
                    run at runtime, before your handler does. Attach one to the wrong handler kind and it fails to
                    compile.
                </p>
                <p className={cn('mt-4 max-w-md text-lg/snug font-medium text-(--pith)')}>
                    A refusal answers the user on its own, with a message you write once beside the check. Everyday
                    refusals stay out of your logs, and the ones you mark as faults get logged and reported.
                </p>
            </GateEvaluator>
        </Section>
    );
}
