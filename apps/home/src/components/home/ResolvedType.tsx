import { cn } from '@seedcord/ui';

import { CodeCard } from '#components/code/CodeCard';
import { Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { resolvedCheck } from '#lib/code/samples';

import type { ReactNode } from 'react';

export function ResolvedType(): ReactNode {
    return (
        <Section ground="rind" className={cn('grid items-center gap-8 md:grid-cols-[1fr_28rem]')}>
            <div>
                <p className={cn('font-mono-code mb-2 text-sm font-semibold text-(--pith)')}>the resolved type</p>
                <p
                    className={cn(
                        'font-display text-[clamp(1.6rem,3.4vw,2.6rem)] leading-tight font-semibold text-balance'
                    )}
                >
                    Hover <Code className={cn('rounded-sm bg-(--seed-dark)/30 px-2 text-[0.82em]')}>category</Code> and
                    the editor says{' '}
                    <Code className={cn('rounded-sm bg-(--seed-dark)/30 px-2 text-[0.82em]')}>
                        {"'books' | 'films'"}
                    </Code>
                    . You never typed that union.
                </p>
            </div>
            <CodeCard code={resolvedCheck} filename="proof.ts" className={cn('rule-pith blk-pith w-full')} />
        </Section>
    );
}
