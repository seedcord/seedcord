import { cn, Icon, tw } from '@seedcord/ui';
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

import { Eyebrow, Section } from '@components/home/Section';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Accent = 'flesh' | 'rind';

interface Group {
    area: string;
    count: number;
    accent: Accent;
    rows: { icon: LucideIcon; label: string; gloss: string }[];
}

const GROUPS: Group[] = [
    {
        area: 'Commands & interactions',
        count: 6,
        accent: 'flesh',
        rows: [
            { icon: FolderTree, label: 'filesystem routing', gloss: 'a file is a command, registered on boot' },
            { icon: AtSign, label: 'command mentions', gloss: 'typed, clickable, compile-checked' },
            { icon: Smile, label: 'emojis', gloss: 'resolved at startup, typed by name' },
            { icon: Sparkles, label: 'autocomplete', gloss: 'typed suggestions as the user types' },
            { icon: MousePointerClick, label: 'context menus', gloss: 'user and message, typed and routed' },
            {
                icon: MessageSquareWarning,
                label: 'getConfirmation',
                gloss: 'an ephemeral confirm, resolves to a boolean'
            }
        ]
    },
    {
        area: 'Events',
        count: 4,
        accent: 'rind',
        rows: [
            { icon: Radio, label: 'event handlers', gloss: 'body typed to the exact event' },
            { icon: RadioTower, label: 'event emitter', gloss: 'a fully typed EventEmitter' },
            { icon: Rss, label: 'pub/sub bus', gloss: 'an application event bus, add your own' },
            { icon: GitMerge, label: 'middleware', gloss: 'typed, runs before your handlers' }
        ]
    },
    {
        area: 'Runtime',
        count: 4,
        accent: 'flesh',
        rows: [
            { icon: ShieldAlert, label: 'errors', gloss: 'Notice to refuse, Fault to trace, Silence to drop' },
            { icon: Timer, label: 'rate limiter', gloss: 'per-key sliding window' },
            { icon: HeartPulse, label: 'lifecycle', gloss: 'phased startup, shutdown and health' },
            { icon: ScrollText, label: 'logger', gloss: 'scoped channels, rotation, sinks' }
        ]
    },
    {
        area: 'Dev experience',
        count: 3,
        accent: 'rind',
        rows: [
            { icon: RefreshCw, label: 'hot reload', gloss: 'live code, the gateway stays up' },
            { icon: WandSparkles, label: 'seedcord commands', gloss: 'inspect and prune deployed guild commands' },
            { icon: SquareTerminal, label: 'seedcord dev', gloss: 'a full-screen dev terminal' }
        ]
    },
    {
        area: 'Extensibility',
        count: 2,
        accent: 'flesh',
        rows: [
            { icon: Plug, label: 'plugins', gloss: 'attach one, reach it typed in any handler' },
            { icon: Wrench, label: 'utils', gloss: 'duration parsing, ascii tables and more' }
        ]
    }
];

const ACCENT_TEXT: Record<Accent, string> = {
    flesh: tw`text-(--flesh)`,
    rind: tw`text-(--rind)`
};

const ROW = tw`flex items-start gap-3 py-2`;

function pad(count: number): string {
    return count.toString().padStart(2, '0');
}

export function FeatureGrid(): ReactNode {
    return (
        <Section ground="cream">
            <Eyebrow ground="cream">05 / EVERYTHING ELSE</Eyebrow>
            <h2
                className={cn(
                    'font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight'
                )}
            >
                It all comes
                <br />
                <span className={cn('text-(--flesh)')}>built in.</span>
            </h2>

            <div className={cn('rule blk mt-10 rounded-sm bg-(--cream)')}>
                {GROUPS.map((group, groupIndex) => (
                    <div
                        key={group.area}
                        className={cn('p-5 sm:p-6', groupIndex > 0 && 'border-t border-(--seed-dark)/10')}
                    >
                        <p
                            className={cn(
                                'font-mono-code mb-3 text-xs font-semibold tracking-wide uppercase',
                                ACCENT_TEXT[group.accent]
                            )}
                        >
                            {group.area} · {pad(group.count)}
                        </p>
                        <div className={cn('grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3')}>
                            {group.rows.map((row) => (
                                <div key={row.label} className={cn(ROW)}>
                                    <Icon
                                        icon={row.icon}
                                        size={20}
                                        className={cn('mt-0.5 shrink-0', ACCENT_TEXT[group.accent])}
                                    />
                                    <div className={cn('min-w-0')}>
                                        <p className={cn('font-mono-code font-semibold text-(--seed-dark)')}>
                                            {row.label}
                                        </p>
                                        <p className={cn('text-sm text-(--seed-dark)/60')}>{row.gloss}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    );
}
