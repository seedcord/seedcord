import { cn } from '@seedcord/ui';

import { CodeCard } from '@components/code/CodeCard';
import { Eyebrow, Section } from '@components/home/Section';
import { PosterButton } from '@components/ui/PosterButton';
import { startTerminal } from '@lib/code/samples';

import type { ReactNode } from 'react';

export function GetStarted(): ReactNode {
    return (
        <Section ground="ink">
            <div className={cn('grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]')}>
                <div>
                    <Eyebrow ground="ink">05 / GET STARTED</Eyebrow>
                    <h2
                        className={cn(
                            'font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] font-semibold tracking-tight'
                        )}
                    >
                        From install
                        <br />
                        to <span className={cn('text-(--flesh)')}>hot reload</span>.
                    </h2>
                    <p className={cn('mt-6 max-w-md text-lg font-medium text-(--cream)/80')}>
                        Add the package, generate the option types from your builders, and start with hot reload on.
                        There is no scaffold step to learn.
                    </p>
                    <div className={cn('mt-8 flex flex-wrap gap-3')}>
                        <PosterButton
                            href="https://guide.seedcord.org"
                            variant="solidDark"
                            className={cn('font-display px-7 py-3 text-lg')}
                        >
                            Read the guide
                        </PosterButton>
                        <PosterButton
                            href="https://github.com/seedcord/seedcord"
                            variant="outlineDark"
                            className={cn('font-display px-7 py-3 text-lg')}
                        >
                            Star on GitHub
                        </PosterButton>
                    </div>
                </div>
                <CodeCard code={startTerminal} filename="terminal" lang="bash" className={cn('rule-cream blk-cream')} />
            </div>
        </Section>
    );
}
