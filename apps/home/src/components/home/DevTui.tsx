import { cn } from '@seedcord/ui';

import { Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { CDN_URL } from '#lib/site';

import type { ReactNode } from 'react';

// eslint-disable-next-line no-magic-numbers -- the widths we export
const WIDTHS = [640, 1024, 1240, 1860, 2480] as const;

const SHOT = `${CDN_URL}/assets/screenshots/dev-tui`;

const SRCSET = WIDTHS.map((w) => `${SHOT}-${w}.webp ${w}w`).join(', ');

// 1320 is Section's max-w-(--shell-max) plus its two 20px gutters
const SIZES = '(min-width: 1320px) 1240px, calc(100vw - 40px)';

export function DevTui(): ReactNode {
    return (
        <Section ground="ink">
            <div className={cn('max-w-2xl')}>
                <h2
                    className={cn(
                        'font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight'
                    )}
                >
                    The dev server has a <span className={cn('text-(--flesh)')}>UI</span>.
                </h2>
                <p className={cn('mt-6 text-lg/snug font-medium text-(--pith)/80')}>
                    <Code className={cn('text-[0.95em] text-(--flesh)')}>seedcord dev</Code> starts your bot inside a
                    terminal UI. Filter the log stream by channel and level, and watch the uptime beside it. On http you
                    get the bound port and the tunnel status too. Save a handler and Vite swaps it in a few milliseconds
                    with the bot still up, so your change reaches Discord without a restart.
                </p>
            </div>
            <figure className={cn('rule-pith blk-pith mt-10 overflow-hidden rounded-sm')}>
                {/* eslint-disable-next-line @next/next/no-img-element -- next/image emits a single src when unoptimized is on, so this srcset never gets used */}
                <img
                    src={`${SHOT}-1240.webp`}
                    srcSet={SRCSET}
                    sizes={SIZES}
                    width={3456}
                    height={2168}
                    loading="lazy"
                    decoding="async"
                    alt="The seedcord dev server running an http bot. A sidebar on the left shows the version, uptime, bound port and tunnel status. The log stream beside it shows a handler failing, reloading in 4ms, then serving the same command. A card at the bottom asks whether to refresh the changed commands."
                    className={cn('block h-auto w-full')}
                />
            </figure>
        </Section>
    );
}
