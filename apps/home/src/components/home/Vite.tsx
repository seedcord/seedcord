import { cn, tw } from '@seedcord/ui';
import { FolderInput, Layers, Puzzle, Zap } from 'lucide-react';

import { CodeCard } from '#components/code/CodeCard';
import { SECTION_HEADING, Section } from '#components/home/Section';
import { Chips } from '#components/ui/Chips';
import { Code } from '#components/ui/Code';
import { SiteLink } from '#components/ui/SiteLink';
import { CODE_MARK_INK } from '#lib/code/marks';
import { viteConfig, viteHandler } from '#lib/code/samples';
import { ENVAPT_URL, VITE_PLUGINS_URL } from '#lib/site';

import type { ReactNode } from 'react';

const CHIPS = [
    { icon: Puzzle, label: 'any Vite plugin' },
    { icon: Layers, label: '.env modes' },
    { icon: Zap, label: 'hot reload' },
    { icon: FolderInput, label: 'data files' }
] as const;

const INLINE_LINK = tw`font-semibold text-(--pith) underline underline-offset-4 transition-colors hover:text-(--flesh)`;

export function Vite(): ReactNode {
    return (
        <Section ground="ink">
            <div className={cn('grid items-start gap-x-10 gap-y-6 lg:grid-cols-2')}>
                <h2 className={cn(SECTION_HEADING)}>
                    Your bot runs on Vite.
                    <br />
                    Bring <span className={cn('text-(--flesh)')}>any plugin</span>.
                </h2>
                <div className={cn('min-w-0')}>
                    <p className={cn('text-lg/snug font-medium text-(--pith)/80')}>
                        seedcord loads your bot through Vite, from the first{' '}
                        <Code className={cn(CODE_MARK_INK)}>seedcord dev</Code> to the production build. With{' '}
                        <SiteLink href={VITE_PLUGINS_URL} className={cn(INLINE_LINK)}>
                            a plugin
                        </SiteLink>{' '}
                        in <Code className={cn(CODE_MARK_INK)}>seedcord.config.ts</Code>, your handlers import YAML,
                        SQL, or anything else that plugin loads.
                    </p>
                    <p className={cn('mt-4 text-lg/snug font-medium text-(--pith)/80')}>
                        The same plugins, <Code className={cn(CODE_MARK_INK)}>.env</Code> modes, and data files work in
                        dev and in the build. <Code className={cn(CODE_MARK_INK)}>ENV=staging pnpm build</Code> loads
                        your <Code className={cn(CODE_MARK_INK)}>.env.staging</Code> files, and{' '}
                        <SiteLink href={ENVAPT_URL} className={cn(INLINE_LINK)}>
                            envapt
                        </SiteLink>{' '}
                        reads them in your bot.
                    </p>
                    <Chips items={CHIPS} ground="ink" />
                </div>
            </div>
            <div className={cn('mt-10 grid gap-x-10 gap-y-5 lg:grid-cols-2')}>
                <CodeCard
                    code={viteConfig}
                    filename="seedcord.config.ts"
                    note="add a plugin"
                    className={cn('rule-pith blk-pith')}
                />
                <CodeCard
                    code={viteHandler}
                    filename="handlers/greet.ts"
                    note="import what it loads"
                    className={cn('rule-pith blk-pith')}
                />
            </div>
        </Section>
    );
}
