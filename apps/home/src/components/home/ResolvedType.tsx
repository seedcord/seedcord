import { cn } from '@seedcord/ui';

import { CodeCard } from '@components/code/CodeCard';
import { Section } from '@components/home/Section';
import { resolvedCheck } from '@lib/code/samples';

import type { ReactNode } from 'react';

export function ResolvedType(): ReactNode {
    return (
        <Section ground="rind" className={cn('grid items-center gap-8 md:grid-cols-[1fr_28rem]')}>
            <div>
                <p className={cn('font-mono-code mb-2 text-sm font-semibold text-(--cream)/80')}>the resolved type</p>
                <p
                    className={cn(
                        'font-display text-[clamp(1.6rem,3.4vw,2.6rem)] leading-tight font-semibold text-balance'
                    )}
                >
                    Hover{' '}
                    <code className={cn('font-mono-code rounded-sm bg-(--seed-dark)/30 px-2 text-[0.82em]')}>
                        category
                    </code>{' '}
                    and the editor says{' '}
                    <span className={cn('font-mono-code rounded-sm bg-(--seed-dark)/30 px-2 text-[0.82em]')}>
                        {"'books' | 'films'"}
                    </span>
                    . You never typed that union.
                </p>
            </div>
            <CodeCard code={resolvedCheck} filename="proof.ts" className={cn('rule-cream blk-cream w-full')} />
        </Section>
    );
}
