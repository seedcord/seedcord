import { cn, tw } from '@seedcord/ui';

import { CodeCard } from '#components/code/CodeCard';
import { SECTION_HEADING, Section } from '#components/home/Section';
import { afterSeedcord, beforeRawDjs } from '#lib/code/samples';

import type { ReactNode } from 'react';

const GONE = [
    { what: 'No deploy script', why: 'Your bot sends its commands to Discord when it starts.' },
    { what: 'No command switch', why: 'The route decorator picks the handler.' },
    { what: 'No server check', why: 'The gate refuses a DM and replies for you.' },
    { what: 'No cast', why: 'Codegen types the option from your builder.' },
    { what: 'No try/catch', why: 'A throw replies to the user, logs, and reports.' }
] as const;

const FADE = tw`after:pointer-events-none after:absolute after:inset-x-0.75 after:bottom-0.75 after:h-24 after:bg-linear-to-t after:from-(--seed-dark) after:from-15% max-lg:after:right-3.25`;

export function BeforeAfter(): ReactNode {
    return (
        <Section ground="rind">
            <h2 className={cn(SECTION_HEADING)}>
                Same command.
                <br />
                Far less to write.
            </h2>
            <div className={cn('mt-10 grid gap-6 lg:grid-cols-2')}>
                {/* on desktop the seedcord card sets the row's height, and this one scrolls inside it */}
                <div className={cn('relative min-w-0 max-lg:h-96', FADE)}>
                    <CodeCard
                        code={beforeRawDjs}
                        filename="discord.js"
                        scrolls
                        className={cn('blk-pith h-full rule lg:absolute lg:inset-0')}
                    />
                </div>
                <CodeCard code={afterSeedcord} filename="seedcord" className={cn('blk-pith rule')} />
            </div>
            <dl
                className={cn(
                    'mt-8 max-lg:divide-y max-lg:divide-(--pith)/25 lg:mt-10 lg:grid lg:grid-cols-5 lg:gap-x-6'
                )}
            >
                {GONE.map((item) => (
                    <div key={item.what} className={cn('max-lg:py-2.5 lg:border-t-[3px] lg:border-(--pith) lg:pt-3')}>
                        <dt
                            className={cn(
                                'lg:font-display font-semibold max-lg:inline max-lg:after:content-["."] lg:text-lg'
                            )}
                        >
                            {item.what}
                        </dt>{' '}
                        <dd className={cn('text-(--pith)/85 max-lg:inline lg:mt-1')}>{item.why}</dd>
                    </div>
                ))}
            </dl>
        </Section>
    );
}
