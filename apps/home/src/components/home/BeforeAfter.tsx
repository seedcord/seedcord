import { cn, Icon } from '@seedcord/ui';
import { ArrowRight } from 'lucide-react';

import { CodeCard } from '@components/code/CodeCard';
import { Eyebrow, Section } from '@components/home/Section';
import { afterSeedcord, beforeRawDjs } from '@lib/code/samples';

import type { ReactNode } from 'react';

export function BeforeAfter(): ReactNode {
    return (
        <Section ground="cream">
            <div className={cn('mb-10 flex flex-wrap items-end justify-between gap-4')}>
                <div>
                    <Eyebrow ground="cream">02 / LESS BOILERPLATE</Eyebrow>
                    <h2
                        className={cn(
                            'font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight'
                        )}
                    >
                        Same command.
                        <br />
                        <span className={cn('text-(--flesh)')}>Far less</span> to write.
                    </h2>
                </div>
                <div className={cn('font-mono-code flex items-center gap-3 text-sm font-semibold')}>
                    <span className={cn('rounded-sm bg-(--seed-dark) px-3 py-2 text-(--cream)')}>by hand</span>
                    <Icon icon={ArrowRight} size={20} className={cn('text-(--seed-dark)')} />
                    <span className={cn('blk-sm rounded-sm bg-(--flesh) px-3 py-2 text-(--cream)')}>
                        seedcord · one handler
                    </span>
                </div>
            </div>
            <div className={cn('grid gap-6 lg:grid-cols-2')}>
                <CodeCard code={beforeRawDjs} filename="by hand" className={cn('rule blk-rind')} />
                <CodeCard code={afterSeedcord} filename="seedcord" className={cn('rule blk-rind')} />
            </div>
            <p className={cn('font-mono-code mt-5 text-xs text-(--seed-dark)/60')}>
                The left wires the routing, registration and checks by hand. seedcord does that wiring from your
                decorators.
            </p>
        </Section>
    );
}
