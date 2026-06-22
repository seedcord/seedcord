import { cn, Icon } from '@seedcord/ui';
import {
    AtSign,
    FolderTree,
    GitMerge,
    HeartPulse,
    MessageSquareWarning,
    MousePointerClick,
    Plug,
    Radio,
    RadioTower,
    RefreshCw,
    Rss,
    ScrollText,
    ShieldAlert,
    Smile,
    Sparkles,
    SquareTerminal,
    Timer,
    WandSparkles,
    Wrench
} from 'lucide-react';

import { Section } from '@components/home/Section';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Card {
    title: string;
    icon: LucideIcon;
    dark: boolean;
    wide: boolean;
    body: ReactNode;
}

const CARDS: Card[] = [
    {
        title: 'Hot reload, live gateway',
        icon: RefreshCw,
        dark: true,
        wide: true,
        body: 'Edit a command, save, and the new code is live with the gateway still connected. No reconnect and no rate-limit penalty.'
    },
    {
        title: 'Filesystem routing',
        icon: FolderTree,
        dark: false,
        wide: false,
        body: (
            <>
                A file under <code className={cn('font-mono-code text-(--flesh)')}>commands/</code> is a command,
                registered on boot.
            </>
        )
    },
    {
        title: 'Typed command mentions',
        icon: AtSign,
        dark: true,
        wide: true,
        body: (
            <>
                A typed <code className={cn('font-mono-code text-(--rind)')}>CommandMentions</code> map turns any
                deployed route into a clickable mention. A wrong name is a compile error.
            </>
        )
    },
    {
        title: 'Typed emojis',
        icon: Smile,
        dark: true,
        wide: false,
        body: 'App emojis resolve at startup, typed by name, missing ones fail the boot.'
    },
    {
        title: 'First-class plugins',
        icon: Plug,
        dark: true,
        wide: true,
        body: 'Attach a plugin and reach it, fully typed, from any handler. Postgres (Kysely) and Mongo are built in, or write your own.'
    },
    {
        title: 'Autocomplete handlers',
        icon: Sparkles,
        dark: false,
        wide: false,
        body: 'Typed autocomplete, return suggestions as the user types.'
    },
    {
        title: 'Context menu commands',
        icon: MousePointerClick,
        dark: true,
        wide: false,
        body: 'User and message context menus, typed and routed like slash commands.'
    },
    {
        title: 'Confirmation prompts',
        icon: MessageSquareWarning,
        dark: false,
        wide: false,
        body: (
            <>
                <code className={cn('font-mono-code text-(--flesh)')}>getConfirmation</code> sends an ephemeral confirm
                prompt and resolves to a boolean.
            </>
        )
    },
    {
        title: 'Typed event handlers',
        icon: Radio,
        dark: true,
        wide: false,
        body: (
            <>
                <code className={cn('font-mono-code text-(--rind)')}>@RegisterEvent</code> binds a handler whose body is
                typed to that exact event.
            </>
        )
    },
    {
        title: 'Strict event emitter',
        icon: RadioTower,
        dark: false,
        wide: false,
        body: 'A fully typed EventEmitter, every emit and listener checked against the event map.'
    },
    {
        title: 'Typed pub/sub bus',
        icon: Rss,
        dark: true,
        wide: false,
        body: 'An application event bus, add your own events by augmenting one interface.'
    },
    {
        title: 'Interaction and event middleware',
        icon: GitMerge,
        dark: false,
        wide: false,
        body: 'Typed middleware runs before your handlers, the payload typed per registration.'
    },
    {
        title: 'Notice, Fault, Silence',
        icon: ShieldAlert,
        dark: true,
        wide: false,
        body: 'Refuse with a Notice, log and trace a Fault, or Silence with no reply.'
    },
    {
        title: 'Sliding-window rate limiter',
        icon: Timer,
        dark: false,
        wide: false,
        body: 'Per-key sliding-window limiting, separate from per-command cooldowns.'
    },
    {
        title: 'Coordinated lifecycle',
        icon: HeartPulse,
        dark: true,
        wide: false,
        body: 'Phased startup and shutdown with SIGTERM handling and an HTTP health check.'
    },
    {
        title: 'Scoped logger',
        icon: ScrollText,
        dark: false,
        wide: false,
        body: 'A Winston wrapper with named channels, rotation, and an installable sink.'
    },
    {
        title: 'seedcord commands',
        icon: WandSparkles,
        dark: true,
        wide: false,
        body: 'Inspect and prune your deployed guild commands from the CLI.'
    },
    {
        title: 'Utility functions',
        icon: Wrench,
        dark: false,
        wide: false,
        body: 'Typed helpers, duration parsing, ascii tables and more.'
    },
    {
        title: 'Live dev terminal',
        icon: SquareTerminal,
        dark: true,
        wide: false,
        body: (
            <>
                <code className={cn('font-mono-code text-(--rind)')}>seedcord dev</code> runs a full-screen terminal UI
                with logs, reload and gateway state.
            </>
        )
    }
];

export function FeatureGrid(): ReactNode {
    return (
        <Section ground="cream">
            <div className={cn('grid grid-flow-dense gap-4 md:grid-cols-2 lg:grid-cols-3')}>
                {CARDS.map((card) => (
                    <div
                        key={card.title}
                        className={cn(
                            'rule blk-sm rounded-sm p-6',
                            card.dark ? 'bg-(--seed-dark) text-(--cream)' : 'bg-(--cream)',
                            card.wide && 'lg:col-span-2'
                        )}
                    >
                        <div
                            className={cn(
                                'flex items-center justify-center rounded-sm',
                                card.wide ? 'size-12' : 'size-10',
                                card.dark ? 'bg-(--flesh)' : 'bg-(--rind)'
                            )}
                        >
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
