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
    wide: boolean;
    square: 'rind' | 'flesh';
    body: ReactNode;
}

// three featured cards (wide, dark) anchor the grid; the rest stay cream so the section never gets dark-heavy
const CARDS: Card[] = [
    {
        title: 'Hot reload, live gateway',
        icon: RefreshCw,
        wide: true,
        square: 'flesh',
        body: 'Edit a command, save, and the new code is live with the gateway still connected. No reconnect and no rate-limit penalty.'
    },
    {
        title: 'Filesystem routing',
        icon: FolderTree,
        wide: false,
        square: 'rind',
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
        wide: true,
        square: 'flesh',
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
        wide: false,
        square: 'flesh',
        body: 'App emojis resolve at startup, typed by name, missing ones fail the boot.'
    },
    {
        title: 'First-class plugins',
        icon: Plug,
        wide: true,
        square: 'flesh',
        body: 'Attach a plugin and reach it, fully typed, from any handler. Postgres (Kysely) and Mongo are built in, or write your own.'
    },
    {
        title: 'Autocomplete handlers',
        icon: Sparkles,
        wide: false,
        square: 'rind',
        body: 'Typed autocomplete, return suggestions as the user types.'
    },
    {
        title: 'Context menu commands',
        icon: MousePointerClick,
        wide: false,
        square: 'flesh',
        body: 'User and message context menus, typed and routed like slash commands.'
    },
    {
        title: 'Confirmation prompts',
        icon: MessageSquareWarning,
        wide: false,
        square: 'rind',
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
        wide: false,
        square: 'flesh',
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
        wide: false,
        square: 'rind',
        body: 'A fully typed EventEmitter, every emit and listener checked against the event map.'
    },
    {
        title: 'Typed pub/sub bus',
        icon: Rss,
        wide: false,
        square: 'flesh',
        body: 'An application event bus, add your own events by augmenting one interface.'
    },
    {
        title: 'Interaction and event middleware',
        icon: GitMerge,
        wide: false,
        square: 'rind',
        body: 'Typed middleware runs before your handlers, the payload typed per registration.'
    },
    {
        title: 'Notice, Fault, Silence',
        icon: ShieldAlert,
        wide: false,
        square: 'flesh',
        body: 'Refuse with a Notice, log and trace a Fault, or Silence with no reply.'
    },
    {
        title: 'Sliding-window rate limiter',
        icon: Timer,
        wide: false,
        square: 'rind',
        body: 'Per-key sliding-window limiting, separate from per-command cooldowns.'
    },
    {
        title: 'Coordinated lifecycle',
        icon: HeartPulse,
        wide: false,
        square: 'flesh',
        body: 'Phased startup and shutdown with SIGTERM handling and an HTTP health check.'
    },
    {
        title: 'Scoped logger',
        icon: ScrollText,
        wide: false,
        square: 'rind',
        body: 'A Winston wrapper with named channels, rotation, and an installable sink.'
    },
    {
        title: 'seedcord commands',
        icon: WandSparkles,
        wide: false,
        square: 'flesh',
        body: 'Inspect and prune your deployed guild commands from the CLI.'
    },
    {
        title: 'Utility functions',
        icon: Wrench,
        wide: false,
        square: 'rind',
        body: 'Typed helpers, duration parsing, ascii tables and more.'
    },
    {
        title: 'Live dev terminal',
        icon: SquareTerminal,
        wide: false,
        square: 'flesh',
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
            <div className={cn('grid grid-flow-dense gap-4 sm:grid-cols-2 lg:grid-cols-3')}>
                {CARDS.map((card) => (
                    <div
                        key={card.title}
                        className={cn(
                            'rounded-sm',
                            card.wide
                                ? 'rule-cream blk-rind bg-(--seed-dark) p-6 text-(--cream) lg:col-span-2'
                                : 'rule bg-(--cream) p-5'
                        )}
                    >
                        <div
                            className={cn(
                                'flex items-center justify-center rounded-sm text-(--cream)',
                                card.wide ? 'size-11' : 'size-9',
                                card.square === 'flesh' ? 'bg-(--flesh)' : 'bg-(--rind)'
                            )}
                        >
                            <Icon icon={card.icon} size={20} />
                        </div>
                        <h3 className={cn('mt-4 mb-1.5 font-semibold', card.wide ? 'text-xl' : 'text-lg')}>
                            {card.title}
                        </h3>
                        <p className={cn('text-sm/relaxed', card.wide ? 'text-(--cream)/80' : 'text-(--seed-dark)/75')}>
                            {card.body}
                        </p>
                    </div>
                ))}
            </div>
        </Section>
    );
}
