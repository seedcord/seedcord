import { cn } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';
import Link from 'next/link';

import { DOCS_URL, HOME_URL } from '#lib/site';

import type { ReactNode } from 'react';

const LINKS = [
    { label: 'Start here', href: '/' },
    { label: 'seedcord.org', href: HOME_URL },
    { label: 'docs.seedcord.org', href: DOCS_URL }
] as const;

export function NotFoundPanel(): ReactNode {
    return (
        <main
            id="main-content"
            className={cn(
                'flex min-h-screen flex-col items-center justify-center gap-6 bg-(--pith) px-5 py-20 text-center'
            )}
        >
            <Materwelon className={cn('drop-shadow-mark size-24')} />
            <h1
                className={cn(
                    'font-display text-[clamp(2.6rem,8vw,5rem)] leading-[0.94] font-semibold tracking-tight text-(--seed-dark)'
                )}
            >
                Nothing <span className={cn('text-(--flesh-deep)')}>here</span>.
            </h1>
            <p className={cn('max-w-md text-lg/snug font-medium text-(--seed-dark)/85')}>
                That page does not exist. Search from any guide page, or pick one of these.
            </p>
            <div className={cn('mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono')}>
                {LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn('text-sm font-semibold text-(--seed-dark) underline underline-offset-4')}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </main>
    );
}
