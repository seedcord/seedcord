import { cn } from '@seedcord/ui';

import { SECTION_HEADING, Section } from '#components/home/Section';
import { Code } from '#components/ui/Code';
import { CODE_MARK_INK } from '#lib/code/marks';
import { CDN_URL } from '#lib/site';

import type { ReactNode } from 'react';

// eslint-disable-next-line no-magic-numbers -- the widths we export
const WIDTHS = [640, 1024, 1240, 1860, 2480] as const;

const SHOT = `${CDN_URL}/assets/screenshots/dev-tui`;

const SRCSET = WIDTHS.map((w) => `${SHOT}-${w}.webp ${w}w`).join(', ');

// 1320 is Section's max-w-(--shell-max) plus its two 20px gutters
const SIZES = '(min-width: 1320px) 1240px, calc(100vw - 40px)';

// the screenshot at 32px. jpeg still renders where the webp above fails
const BLUR =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAwICQsJCAwLCgsODQwOEh4UEhEREiUbHBYeLCcuLisnKyoxN0Y7MTRCNCorPVM+QkhKTk9OLztWXFVMW0ZNTkv/2wBDAQ0ODhIQEiQUFCRLMisyS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0v/wAARCAAUACADASIAAhEBAxEB/8QAGQABAQADAQAAAAAAAAAAAAAAAAMBAgQG/8QAIBAAAgIBBAMBAAAAAAAAAAAAAAECEQMEISIxEjKRUf/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A8ZB8571x+lcjqPvH4Q06Tc734Mvl8VD1XQHI3bMBpoAU07qbX6qYyZJT2fSAA0oUARX/2Q==';

export function DevTui(): ReactNode {
    return (
        <Section ground="ink">
            <h2 className={cn(SECTION_HEADING)}>
                The dev server has a <span className={cn('text-(--flesh)')}>UI</span>.
            </h2>
            <p className={cn('mt-6 text-lg/snug font-medium text-(--pith)/80')}>
                <Code className={cn(CODE_MARK_INK)}>seedcord dev</Code> starts your bot inside a terminal UI. Filter the
                log stream by channel and level, and watch the uptime beside it. On http you get the bound port and the
                tunnel status too. Save a handler and Vite swaps it in a few milliseconds with the bot still up, so your
                change reaches Discord without a restart.
            </p>
            <figure className={cn('rule-pith blk-pith relative mt-10 overflow-hidden rounded-sm')}>
                {/* idk why safari sometimes doesn't paints this image */}
                <div
                    className={cn('absolute inset-0 scale-110 bg-cover bg-center blur-xl')}
                    style={{ backgroundImage: `url("${BLUR}")` }}
                    aria-hidden
                />
                <div className={cn('shot-settle absolute inset-0 bg-(--husk)')} aria-hidden />
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
                    className={cn('shot-img relative block h-auto w-full')}
                />
            </figure>
        </Section>
    );
}
