import { cn, Icon, tw } from '@seedcord/ui';
import {
    Activity,
    AtSign,
    Blocks,
    Cable,
    Component,
    Database,
    FileCode2,
    GalleryHorizontalEnd,
    Gauge,
    GitMerge,
    HeartPulse,
    Hourglass,
    KeyRound,
    Leaf,
    ListTree,
    MessageSquareWarning,
    MousePointerClick,
    PackagePlus,
    Plug,
    Radio,
    RadioTower,
    RefreshCw,
    Rss,
    ScrollText,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    Smile,
    Sparkles,
    SpellCheck,
    Split,
    SquareTerminal,
    TimerReset,
    WandSparkles,
    Waypoints,
    Webhook
} from 'lucide-react';

import { SECTION_HEADING, Section } from '#components/home/Section';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Accent = 'flesh' | 'rind';

interface Group {
    area: string;
    accent: Accent;
    rows: { icon: LucideIcon; label: string; gloss: string }[];
}

const GROUPS: Group[] = [
    {
        area: 'Commands',
        accent: 'flesh',
        rows: [
            {
                icon: Waypoints,
                label: 'decorator routing',
                gloss: '@SlashRoute, @ButtonRoute and five more bind handlers at startup'
            },
            { icon: ListTree, label: 'subcommand routing', gloss: 'subcommands and groups, routed by name' },
            {
                icon: SlidersHorizontal,
                label: 'typed slash options',
                gloss: 'accessors generated from your command definitions'
            },
            {
                icon: Sparkles,
                label: 'typed autocomplete',
                gloss: 'a handler per option, missing one is a compile error'
            },
            { icon: AtSign, label: 'command mentions', gloss: 'renders </route:id> once Discord assigns the id' },
            { icon: Smile, label: 'emojis', gloss: 'resolved at startup, reached by name' }
        ]
    },
    {
        area: 'Components & replies',
        accent: 'rind',
        rows: [
            {
                icon: Component,
                label: 'component handlers',
                gloss: 'buttons, selects and modals, routed by customId'
            },
            { icon: KeyRound, label: 'customId codec', gloss: 'pack fields into 100 characters, decode them typed' },
            { icon: MousePointerClick, label: 'context menus', gloss: 'user and message commands' },
            {
                icon: Split,
                label: 'multi-route handlers',
                gloss: 'one class serves several routes, narrowed by this.match'
            },
            {
                icon: MessageSquareWarning,
                label: 'getConfirmation',
                gloss: 'an ephemeral confirm, resolves to a boolean'
            },
            {
                icon: GalleryHorizontalEnd,
                label: 'pagination',
                gloss: 'each nav button carries its page, so a restart keeps working'
            }
        ]
    },
    {
        area: 'Events',
        accent: 'flesh',
        rows: [
            { icon: Radio, label: 'event handlers', gloss: 'body typed to the exact event' },
            { icon: RadioTower, label: 'event emitter', gloss: 'event names and payloads typed together' },
            { icon: Hourglass, label: 'typed waitFor', gloss: 'await a single typed event inline' },
            { icon: Rss, label: 'pub/sub bus', gloss: 'framework events publish on default keys' },
            { icon: GitMerge, label: 'middleware', gloss: 'runs before your handler, typed the same way' }
        ]
    },
    {
        area: 'Guards & failures',
        accent: 'rind',
        rows: [
            { icon: ShieldCheck, label: 'permission & role gates', gloss: 'checked before the handler runs' },
            { icon: Blocks, label: 'composable gates', gloss: 'stack them with and, or' },
            { icon: TimerReset, label: 'cooldowns', gloss: 'scoped per user, guild or channel' },
            { icon: Gauge, label: 'rate limiter', gloss: 'a sliding window per key' },
            { icon: ShieldAlert, label: 'errors', gloss: 'Notice to refuse, Fault to report, Silence to drop' }
        ]
    },
    {
        area: 'Runtime',
        accent: 'flesh',
        rows: [
            { icon: HeartPulse, label: 'lifecycle', gloss: 'phased startup and shutdown' },
            { icon: ScrollText, label: 'logger', gloss: 'named channels, levels and sinks' },
            { icon: Activity, label: 'health check', gloss: 'an HTTP endpoint that reports readiness' },
            { icon: Webhook, label: 'webhook reporters', gloss: 'faults posted to a Discord webhook' }
        ]
    },
    {
        area: 'Tooling',
        accent: 'rind',
        rows: [
            { icon: PackagePlus, label: 'create seedcord', gloss: 'answers a few questions, writes the project' },
            { icon: SquareTerminal, label: 'seedcord dev', gloss: 'a full-screen dev terminal' },
            {
                icon: RefreshCw,
                label: 'hot reload',
                gloss: 'Vite HMR swaps changed modules, the gateway stays connected'
            },
            { icon: Cable, label: 'dev tunnel', gloss: 'opens cloudflared and points Discord at it' },
            { icon: FileCode2, label: 'codegen', gloss: 'writes the types for your commands and config' },
            {
                icon: WandSparkles,
                label: 'seedcord commands',
                gloss: 'inspect and clean commands already deployed'
            },
            { icon: SpellCheck, label: 'eslint rules', gloss: 'flags payloads Discord rejects, before you send them' }
        ]
    },
    {
        area: 'Plugins',
        accent: 'flesh',
        rows: [
            { icon: Plug, label: 'typed plugins', gloss: 'attach once, codegen types it on core' },
            { icon: Leaf, label: 'Mongoose', gloss: 'MongoDB, services typed by key' },
            { icon: Database, label: 'Kysely', gloss: 'Postgres, queries typed off your schema' }
        ]
    }
];

const ACCENT_TEXT: Record<Accent, string> = {
    flesh: tw`text-(--flesh-deep)`,
    rind: tw`text-(--rind-deep)`
};

const ROW = tw`group flex items-start gap-3 py-2`;

function pad(count: number): string {
    return count.toString().padStart(2, '0');
}

export function FeatureGrid(): ReactNode {
    return (
        <Section ground="pith">
            <h2 className={cn(SECTION_HEADING)}>
                It all comes <span className={cn('text-(--flesh-deep)')}>built in.</span>
            </h2>

            <div className={cn('rule blk mt-10 rounded-sm bg-(--pith)')}>
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
                            {group.area} · {pad(group.rows.length)}
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
