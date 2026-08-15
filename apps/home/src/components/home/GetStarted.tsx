import { cn } from '@seedcord/ui';

import { CodeCard } from '#components/code/CodeCard';
import { Section } from '#components/home/Section';
import { PosterButton } from '#components/ui/PosterButton';
import { startTerminal } from '#lib/code/samples';
import { GUIDE_URL, REPO_URL } from '#lib/site';

import type { ReactNode } from 'react';

export function GetStarted(): ReactNode {
    return (
        <Section ground="ink">
            <div className={cn('grid items-center gap-10 lg:grid-cols-[1fr_0.8fr]')}>
                <div>
                    <h2
                        className={cn(
                            'font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] font-semibold tracking-tight'
                        )}
                    >
                        From zero
                        <br />
                        to <span className={cn('text-(--flesh)')}>hot reload</span>.
                    </h2>
                    <p className={cn('mt-6 max-w-md text-lg font-medium text-(--pith)/80')}>
                        Scaffold a typed bot, open it, and run it. Routing, registration and the option types are wired
                        for you, and hot reload keeps the gateway alive.
                    </p>
                    <div className={cn('mt-8 flex flex-wrap gap-3')}>
                        <PosterButton
                            href={GUIDE_URL}
                            variant="solidDark"
                            className={cn('font-display px-7 py-3 text-lg')}
                        >
                            Read the guide
                        </PosterButton>
                        <PosterButton
                            href={REPO_URL}
                            variant="outlineDark"
                            className={cn('font-display px-7 py-3 text-lg')}
                        >
                            Star on GitHub
                        </PosterButton>
                    </div>
                </div>
                <CodeCard code={startTerminal} filename="terminal" lang="bash" className={cn('rule-pith blk-pith')} />
            </div>
        </Section>
    );
}
