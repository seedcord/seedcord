import { cn, Icon } from '@seedcord/ui';
import { PlugZap, Radio } from 'lucide-react';

import { SECTION_HEADING, Section } from '#components/home/Section';

import type { ReactNode } from 'react';

const TRANSPORTS = [
    {
        icon: Radio,
        name: '@seedcord/gateway',
        summary: 'Holds a websocket connection, built on discord.js.',
        detail: 'Discord streams every event down it. Messages, joins, voice state, typing, and all other events. Pick it when your bot reacts to anything past interactions.'
    },
    {
        icon: PlugZap,
        name: '@seedcord/http',
        summary: "Answers Discord's interactions endpoint.",
        detail: 'Discord POSTs each interaction to your URL, and seedcord verifies the Ed25519 signature before anything dispatches. Nothing else arrives here, so a commands-only bot never opens a connection.'
    }
] as const;

export function Transports(): ReactNode {
    return (
        <Section ground="rind">
            <h2 className={cn(SECTION_HEADING)}>
                Two transports.
                <br />
                One set of handlers.
            </h2>
            <p className={cn('mt-6 max-w-xl text-lg/snug font-medium text-(--pith)')}>
                Your handlers compile on both, and the import line will usually be the only difference.
            </p>
            <div className={cn('mt-10 grid gap-6 lg:grid-cols-2 lg:gap-10')}>
                {TRANSPORTS.map((transport) => (
                    <div
                        key={transport.name}
                        className={cn('rule-pith blk-pith rounded-sm bg-(--seed-dark) p-6 lg:p-7')}
                    >
                        <p className={cn('flex items-center gap-2.5')}>
                            <Icon icon={transport.icon} size={18} className={cn('shrink-0 text-(--flesh)')} />
                            <span className={cn('font-mono-code text-sm font-semibold')}>{transport.name}</span>
                        </p>
                        <p className={cn('mt-4 text-lg/snug font-semibold')}>{transport.summary}</p>
                        <p className={cn('mt-2.5 text-(--pith)/80')}>{transport.detail}</p>
                    </div>
                ))}
            </div>
        </Section>
    );
}
