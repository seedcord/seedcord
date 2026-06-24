import { cn, Icon, tw } from '@seedcord/ui';
import {
    AtSign,
    Component,
    GalleryHorizontalEnd,
    GitMerge,
    HeartPulse,
    Hourglass,
    ListTree,
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
    Split,
    SquareTerminal,
    Timer,
    WandSparkles,
    Waypoints,
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
        count: 10,
        accent: 'flesh',
        rows: [
            {
                icon: Waypoints,
                label: 'decorator routing',
                gloss: '@SlashRoute, @RegisterEvent and friends wire handlers at boot'
            },
            { icon: ListTree, label: 'subcommand routing', gloss: 'subcommands and groups, routed by name' },
            { icon: AtSign, label: 'command mentions', gloss: 'typed, clickable, compile-checked' },
            { icon: Smile, label: 'emojis', gloss: 'resolved at startup, typed by name' },
            {
                icon: Sparkles,
                label: 'typed autocomplete',
                gloss: 'a typed handler per option, missing one is a compile error'
            },
            { icon: MousePointerClick, label: 'context menus', gloss: 'user and message, typed and routed' },
            {
                icon: Component,
                label: 'component handlers',
                gloss: 'buttons, selects and modals, each routed to a typed handler'
            },
            {
                icon: MessageSquareWarning,
                label: 'getConfirmation',
                gloss: 'an ephemeral confirm, resolves to a boolean'
            },
            {
                icon: Split,
                label: 'multi-route handlers',
                gloss: 'one class serves several routes, each typed via this.match'
            },
            {
                icon: GalleryHorizontalEnd,
                label: 'pagination',
                gloss: 'restart-proof pages, each nav button carries its target'
            }
        ]
    },
    {
        area: 'Events',
        count: 5,
        accent: 'rind',
        rows: [
            { icon: Radio, label: 'event handlers', gloss: 'body typed to the exact event' },
            { icon: RadioTower, label: 'event emitter', gloss: 'a fully typed EventEmitter' },
            { icon: Hourglass, label: 'typed waitFor', gloss: 'await a single typed event inline' },
            { icon: Rss, label: 'pub/sub bus', gloss: 'an application event bus, add your own' },
            { icon: GitMerge, label: 'middleware', gloss: 'typed, runs before your handlers' }
        ]
    },
    {
        area: 'Runtime',
        count: 4,
        accent: 'flesh',
        rows: [
            { icon: ShieldAlert, label: 'errors', gloss: 'Notice to refuse, Fault to report, Silence to drop' },
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
            { icon: RefreshCw, label: 'hot reload', gloss: 'Vite HMR swaps your code live, the gateway stays up' },
            {
                icon: WandSparkles,
                label: 'seedcord commands',
                gloss: 'inspect and clean deployed guild commands'
            },
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
    flesh: tw`text-(--flesh-deep)`,
    rind: tw`text-(--vine-deep)`
};

const ROW = tw`group flex items-start gap-3 py-2`;

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
                It all comes <span className={cn('text-(--flesh-deep)')}>built in.</span>
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
                                        className={cn(
                                            'mt-0.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-safe:group-hover:rotate-12',
                                            ACCENT_TEXT[group.accent]
                                        )}
                                    />
                                    <div className={cn('min-w-0')}>
                                        <p className={cn('font-mono-code font-semibold text-(--seed-dark)')}>
                                            {row.label}
                                        </p>
                                        <p className={cn('text-sm text-(--seed-dark)/70')}>{row.gloss}</p>
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
