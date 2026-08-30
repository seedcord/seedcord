import { cn, tw } from '@seedcord/ui';

import { CodeCard } from '#components/code/CodeCard';
import { SECTION_HEADING, Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { CODE_MARK_LIGHT } from '#lib/code/marks';
import { pluginAttach, pluginGenerated, pluginSource } from '#lib/code/samples';

import type { ReactNode } from 'react';

const CARD = tw`rule blk-rind`;

export function Plugins(): ReactNode {
    return (
        <Section ground="pith">
            <div className={cn('grid items-start gap-x-10 gap-y-6 lg:grid-cols-2')}>
                <h2 className={cn(SECTION_HEADING)}>
                    Write your own Plugin.
                    <br />
                    Reach it from <span className={cn('text-(--flesh-deep)')}>every handler</span>.
                </h2>
                <div className={cn('min-w-0')}>
                    <p className={cn('text-lg/snug font-medium text-(--seed-dark)/85')}>
                        A plugin extends seedcord with whatever your bot needs, a database, a cache, a metrics client.
                        Extend <Code className={cn(CODE_MARK_LIGHT)}>Plugin</Code> and give it a key when you attach it.
                    </p>
                    <p className={cn('mt-4 text-lg/snug font-medium text-(--seed-dark)/85')}>
                        That key becomes a property on the same object every handler already carries.{' '}
                        <Code className={cn(CODE_MARK_LIGHT)}>seedcord codegen</Code> writes its type, so{' '}
                        <Code className={cn(CODE_MARK_LIGHT)}>this.core.uptime.startedAt</Code> compiles wherever you
                        need it.
                    </p>
                </div>
            </div>
            {/* a third column cuts each card to 354px and clips the longest import lines */}
            <div className={cn('mt-10 grid items-start gap-x-10 gap-y-5 lg:grid-cols-2')}>
                <CodeCard code={pluginSource} filename="plugins/uptime.ts" note="write it" className={cn(CARD)} />
                <div className={cn('grid gap-5')}>
                    <CodeCard code={pluginAttach} filename="bot.ts" note="attach it" className={cn(CARD)} />
                    <CodeCard
                        code={pluginGenerated}
                        filename="seedcord-gen.d.ts"
                        note="generated"
                        className={cn(CARD)}
                    />
                </div>
            </div>
        </Section>
    );
}
