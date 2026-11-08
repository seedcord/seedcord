import { cn, Icon } from '@seedcord/ui';
import { Binary, Cloud, PackageOpen, Route, Server } from 'lucide-react';

import { CodeCard } from '#components/code/CodeCard';
import { SECTION_HEADING, Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { CODE_MARK_INK, CODE_MARK_LIGHT } from '#lib/code/marks';
import { packageConsumer } from '#lib/code/samples';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Target {
    icon: LucideIcon;
    name: string;
    detail: ReactNode;
    command: string;
    sample?: ReactNode;
}

const TARGETS: readonly Target[] = [
    {
        icon: Server,
        name: 'a Node or Bun server',
        detail: (
            <>
                Point <Code className={cn(CODE_MARK_INK)}>build.start</Code> at the file that starts your bot, then run
                the output.
            </>
        ),
        command: 'node dist/index.mjs'
    },
    {
        icon: Binary,
        name: 'one Bun binary',
        detail: 'The build prints the command that compiles your bot into a single file.',
        command: 'bun build --compile'
    },
    {
        icon: Cloud,
        name: 'Cloudflare Workers',
        detail: (
            <>
                An http bot with a <Code className={cn(CODE_MARK_INK)}>cloudflare.config.ts</Code> builds into a worker.
            </>
        ),
        command: 'cf deploy --prebuilt'
    },
    {
        icon: Route,
        name: 'inside your server',
        detail: (
            <>
                With <Code className={cn(CODE_MARK_INK)}>port: false</Code>, a Hono or Next.js route passes each request
                to the bot.
            </>
        ),
        command: 'bot.fetch(request)'
    },
    {
        icon: PackageOpen,
        name: 'an npm package',
        detail: (
            <>
                Without <Code className={cn(CODE_MARK_INK)}>build.start</Code>, the build exports your bot with its
                types. You can publish it to npm, and anyone can install it and start it.
            </>
        ),
        command: 'pnpm add your-bot',
        sample: <CodeCard code={packageConsumer} filename="their-app.ts" className={cn('rule-pith')} />
    }
];

function TargetCard({ target }: { target: Target }): ReactNode {
    return (
        <div
            className={cn(
                'rule blk-rind rounded-sm bg-(--seed-dark) p-6 text-(--pith)',
                target.sample && 'grid gap-5 sm:col-span-2 md:grid-cols-2'
            )}
        >
            <div>
                <p className={cn('flex items-center gap-2.5')}>
                    <Icon icon={target.icon} size={18} className={cn('shrink-0 text-(--flesh)')} />
                    <span className={cn('text-lg/snug font-semibold')}>{target.name}</span>
                </p>
                <p className={cn('mt-2.5 text-(--pith)/80')}>{target.detail}</p>
                <p className={cn('font-mono-code mt-4 text-sm text-(--flesh)')}>{target.command}</p>
            </div>
            {target.sample}
        </div>
    );
}

export function Targets(): ReactNode {
    return (
        <Section ground="pith">
            <h2 className={cn(SECTION_HEADING)}>
                One build.
                <br />
                Five places to <span className={cn('text-(--flesh-deep)')}>run it</span>.
            </h2>
            <p className={cn('mt-6 max-w-xl text-lg/snug font-medium text-(--seed-dark)/85')}>
                <Code className={cn(CODE_MARK_LIGHT)}>seedcord build</Code> turns the same bot code into whichever one
                you need.
            </p>
            <div className={cn('mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3')}>
                {TARGETS.map((target) => (
                    <TargetCard key={target.name} target={target} />
                ))}
            </div>
        </Section>
    );
}
