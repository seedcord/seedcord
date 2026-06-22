import { cn, Icon } from '@seedcord/ui';
import {
    FolderTree,
    HeartPulse,
    WandSparkles,
    MousePointerClick,
    Plug,
    RefreshCw,
    ShieldAlert,
    Sparkles,
    SquareTerminal
} from 'lucide-react';

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
        title: 'seedcord commands',
        icon: WandSparkles,
        dark: false,
        square: 'bg-(--rind)',
        body: 'Inspect your deployed application commands and prune stale or duplicate registrations from the CLI, with a guided wizard or flags.'
    },
    {
        title: 'Context menu commands',
        icon: MousePointerClick,
        dark: true,
        square: 'bg-(--flesh)',
        body: 'Right-click a user or a message to run a command. User and message context menus, typed like your slash commands.'
    },
    {
        title: 'Autocomplete handlers',
        icon: Sparkles,
        dark: false,
        square: 'bg-(--rind)',
        body: 'Wire an autocomplete handler to an option and return suggestions as the user types, fully typed.'
    },
    {
        title: 'Notice, Fault, Silence',
        icon: ShieldAlert,
        dark: true,
        square: 'bg-(--flesh)',
        body: 'Throw a Notice to refuse and tell the user why, a Fault to log and trace an unexpected error, or Silence to stop with no reply.'
    },
    {
        title: 'Coordinated lifecycle',
        icon: HeartPulse,
        dark: false,
        square: 'bg-(--rind)',
        body: 'A phased startup and shutdown with SIGTERM handling and an HTTP health check, built for real hosting.'
    },
    {
        title: 'Plugins',
        icon: Plug,
        dark: true,
        square: 'bg-(--flesh)',
        body: 'A plugin contract with first-party Postgres (Kysely) and Mongo plugins, or write your own.'
    },
    {
        title: 'Live dev terminal',
        icon: SquareTerminal,
        dark: false,
        square: 'bg-(--rind)',
        body: (
            <>
                <code className={cn('font-mono-code text-(--flesh)')}>seedcord dev</code> runs a full-screen terminal UI
                with logs, reload status and the gateway state in one view.
            </>
        )
    }
];

export function FeatureGrid(): ReactNode {
    return (
        <Section ground="cream">
            <div className={cn('grid gap-6 md:grid-cols-2 lg:grid-cols-3')}>
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
