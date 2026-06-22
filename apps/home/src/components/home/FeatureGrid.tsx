import { cn, Icon } from '@seedcord/ui';
import { FolderTree, Layers, RefreshCw, ShieldAlert, ShieldCheck, SquareTerminal } from 'lucide-react';

import { Section } from '@components/home/Section';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Card {
    title: string;
    icon: LucideIcon;
    dark: boolean;
    square: string;
    body: ReactNode;
}

const CARDS: Card[] = [
    {
        title: 'Hot reload, live gateway',
        icon: RefreshCw,
        dark: false,
        square: 'bg-(--rind)',
        body: 'Edit a command, save, and the new code is live. The gateway connection stays open the whole time, no reconnect and no rate-limit penalty.'
    },
    {
        title: 'Filesystem routing',
        icon: FolderTree,
        dark: true,
        square: 'bg-(--flesh)',
        body: (
            <>
                A file under <code className={cn('font-mono-code text-(--rind)')}>commands/</code> is a command and a
                decorator names it. Registration happens on boot, no deploy script to babysit.
            </>
        )
    },
    {
        title: 'Composable gates',
        icon: ShieldCheck,
        dark: false,
        square: 'bg-(--rind)',
        body: (
            <>
                Stack <code className={cn('font-mono-code text-(--flesh)')}>@Gated</code> guards (guild, permission,
                role, cooldown) on a handler. Each is compile-checked against the interaction it runs on.
            </>
        )
    },
    {
        title: 'ComponentsV2 replies',
        icon: Layers,
        dark: true,
        square: 'bg-(--flesh)',
        body: 'Build replies with the ComponentsV2 layout, attach files, and route reply, edit or follow-up through one typed response.'
    },
    {
        title: 'Notice, Fault, Silence',
        icon: ShieldAlert,
        dark: false,
        square: 'bg-(--rind)',
        body: 'Throw a Notice to answer the user, a Fault to report and trace an error, or Silence to drop it quietly. Each renders the right reply.'
    },
    {
        title: 'Live dev terminal',
        icon: SquareTerminal,
        dark: true,
        square: 'bg-(--flesh)',
        body: (
            <>
                <code className={cn('font-mono-code text-(--rind)')}>seedcord dev</code> runs a full-screen terminal UI
                with logs, reload status and the gateway state in one view.
            </>
        )
    }
];

export function FeatureGrid(): ReactNode {
    return (
        <Section ground="cream">
            <div className={cn('grid gap-6 md:grid-cols-3')}>
                {CARDS.map((card) => (
                    <div
                        key={card.title}
                        className={cn(
                            'rule blk-sm rounded-sm p-6',
                            card.dark ? 'bg-(--seed-dark) text-(--cream)' : 'bg-(--cream)'
                        )}
                    >
                        <div className={cn('flex size-10 items-center justify-center rounded-sm', card.square)}>
                            <Icon icon={card.icon} size={20} className={cn('text-(--cream)')} />
                        </div>
                        <h3 className={cn('mt-4 mb-2 text-xl font-semibold')}>{card.title}</h3>
                        <p className={cn('leading-snug', card.dark ? 'text-(--cream)/80' : 'text-(--seed-dark)/80')}>
                            {card.body}
                        </p>
                    </div>
                ))}
            </div>
        </Section>
    );
}
