import { cn } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';

import { PosterButton } from '@components/ui/PosterButton';
import { DOCS_URL, GUIDE_URL } from '@lib/site';

import type { ReactNode } from 'react';

export function Hero(): ReactNode {
    return (
        <section className={cn('relative overflow-hidden border-b-[3px] border-(--seed-dark) bg-(--cream)')}>
            <div
                className={cn(
                    'mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16'
                )}
            >
                <div className={cn('relative z-10')}>
                    <div
                        className={cn(
                            'font-mono-code mb-6 inline-flex items-center gap-2 rounded-sm bg-(--seed-dark) px-3 py-1.5 text-sm font-semibold text-(--cream)'
                        )}
                    >
                        discord.js 14 · class + decorator framework
                    </div>
                    <h1
                        className={cn(
                            'font-display text-[clamp(2.9rem,7vw,5.75rem)] leading-[0.94] font-semibold tracking-tight text-(--seed-dark)'
                        )}
                    >
                        The whole Discord bot,
                        <span className={cn('text-(--vine-deep)')}> wired</span> and{' '}
                        <span className={cn('text-(--flesh-deep)')}>typed</span>.
                    </h1>
                    <p className={cn('mt-7 max-w-xl text-lg/snug font-medium text-(--seed-dark)/85 md:text-xl')}>
                        Everything a Discord bot needs, commands, events, components, gates, lifecycle and plugins,
                        wired and typed on top of discord.js. A wrong route or option is a compile error, before the bot
                        ever connects.
                    </p>
                    <div className={cn('mt-8 flex flex-wrap items-center gap-3')}>
                        <PosterButton href={GUIDE_URL} variant="solid" className={cn('font-display px-7 py-3 text-lg')}>
                            Get started
                        </PosterButton>
                        <PosterButton
                            href={DOCS_URL}
                            variant="outline"
                            className={cn('font-display px-7 py-3 text-lg')}
                        >
                            Browse the docs
                        </PosterButton>
                        <span
                            className={cn(
                                'font-mono-code ml-1 rounded-sm bg-(--seed-dark) px-2 py-1 text-sm text-(--cream)'
                            )}
                        >
                            pnpm add seedcord
                        </span>
                    </div>
                </div>

                <div className={cn('relative hidden items-center justify-center lg:flex lg:h-124')}>
                    {/* deeper green so the green in the materwelon doesn't blend with that square in the back */}
                    <div className={cn('blk absolute top-6 right-0 size-[78%] rounded-sm bg-(--vine-deep)')} />
                    <Materwelon className={cn('relative z-10 w-[84%] max-w-124 drop-shadow-mark-lg')} />
                </div>
            </div>
        </section>
    );
}
