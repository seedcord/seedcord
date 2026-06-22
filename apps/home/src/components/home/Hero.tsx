import { cn } from '@seedcord/ui';

import { Watermelon } from '@components/brand/Watermelon';
import { PosterButton } from '@components/ui/PosterButton';

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
                            'font-mono-code mb-6 inline-flex items-center gap-2 rounded-sm bg-(--seed-dark) px-3 py-1.5 text-xs font-semibold text-(--cream)'
                        )}
                    >
                        discord.js 14 · class + decorator framework
                    </div>
                    <h1
                        className={cn(
                            'font-display text-[clamp(3.1rem,8.5vw,7rem)] leading-[0.92] font-semibold tracking-tight text-(--seed-dark)'
                        )}
                    >
                        The whole <span className={cn('text-(--rind)')}>bot</span>,
                        <br />
                        <span className={cn('text-(--flesh)')}>typed</span>.
                    </h1>
                    <p className={cn('mt-7 max-w-xl text-lg/snug font-medium text-(--seed-dark)/85 md:text-xl')}>
                        Routing, interactions, events, gates, lifecycle and plugins, all typed, on top of discord.js. A
                        wrong route or field is a compile error, caught before the bot connects.
                    </p>
                    <div className={cn('mt-8 flex flex-wrap items-center gap-3')}>
                        <PosterButton
                            href="https://guide.seedcord.org"
                            variant="solid"
                            className={cn('font-display px-7 py-3 text-lg')}
                        >
                            Get started
                        </PosterButton>
                        <PosterButton
                            href="https://docs.seedcord.org"
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

                {/* desktop composition, hidden below lg so narrow widths stay text-first */}
                <div className={cn('relative hidden items-center justify-center lg:flex lg:h-140')}>
                    {/* deeper green so the lighter rind stays distinct */}
                    <div className={cn('blk absolute top-6 right-0 size-[78%] rounded-sm bg-(--vine-deep)')} />
                    <Watermelon
                        className={cn('relative z-10 w-[92%] max-w-140 drop-shadow-[10px_10px_0_rgba(45,51,40,0.55)]')}
                    />
                </div>
            </div>
        </section>
    );
}
