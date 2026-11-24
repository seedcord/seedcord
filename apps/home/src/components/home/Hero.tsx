import { PRODUCTION_SITES } from '@seedcord/brand';
import { cn, PosterButton } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';

import { HeroStart } from '#components/home/HeroStart';
import { SiteLink } from '#components/ui/SiteLink';
import { GUIDE_URL } from '#lib/site';

import type { ReactNode } from 'react';

export function Hero(): ReactNode {
    return (
        <section className={cn('relative overflow-hidden bg-(--pith)')}>
            <div
                className={cn(
                    'mx-auto grid max-w-(--shell-max) items-center gap-8 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16'
                )}
            >
                <div className={cn('relative z-10')}>
                    <div
                        className={cn(
                            'font-mono-code mb-6 hidden items-center gap-2 rounded-sm bg-(--seed-dark) px-3 py-1.5 text-sm font-semibold text-(--pith) sm:inline-flex'
                        )}
                    >
                        typescript · gateway/http bot framework
                    </div>
                    <h1
                        className={cn(
                            'font-display text-[clamp(2.9rem,7vw,5.75rem)] leading-[0.94] font-semibold tracking-tight text-balance text-(--seed-dark)'
                        )}
                    >
                        The whole Discord bot, <span className={cn('text-(--rind-deep)')}>typed</span>{' '}
                        <span className={cn('whitespace-nowrap')}>
                            <span className={cn('text-(--flesh-deep)')}>end to end</span>.
                        </span>
                    </h1>
                    <p className={cn('mt-7 max-w-xl text-lg/snug font-medium text-(--seed-dark)/85 md:text-xl')}>
                        <span className={cn('font-semibold text-(--seed-dark) sm:hidden')}>
                            A TypeScript framework for Discord bots.{' '}
                        </span>
                        A wrong route or option name is a compile error, before the bot ever connects. Every command,
                        button, and event goes to a class you write, with reusable checks, any Vite plugin, hot reload,
                        and a lot more built in.
                    </p>
                    <HeroStart />
                    <div className={cn('mt-3 flex flex-wrap items-center gap-3')}>
                        <PosterButton variant="solid">
                            <SiteLink href={GUIDE_URL}>Get started</SiteLink>
                        </PosterButton>
                        <PosterButton variant="outline">
                            <SiteLink href={PRODUCTION_SITES.docs.url}>Browse the docs</SiteLink>
                        </PosterButton>
                    </div>
                </div>

                <div className={cn('relative hidden items-center justify-center lg:flex lg:h-124')}>
                    {/* deeper green so the green in the materwelon doesn't blend with that square in the back */}
                    <div className={cn('absolute top-6 right-0 blk size-[78%] rounded-sm bg-(--rind-deep)')} />
                    <Materwelon className={cn('drop-shadow-mark-lg relative z-10 w-[84%] max-w-124')} />
                </div>
            </div>
        </section>
    );
}
