import { cn, GithubIcon, Icon } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';
import Link from 'next/link';

import { PosterButton } from '@components/ui/PosterButton';
import { DOCS_URL, GUIDE_URL, REPO_URL } from '@lib/site';

import type { ReactNode } from 'react';

const LINKS = [
    { label: 'Guide', href: GUIDE_URL },
    { label: 'Docs', href: DOCS_URL }
] as const;

export function Nav(): ReactNode {
    return (
        <header className={cn('sticky top-0 z-50 border-b-[3px] border-(--seed-dark) bg-(--cream)')}>
            <div className={cn('mx-auto flex h-16 max-w-7xl items-center justify-between px-5')}>
                <Link href="/" className={cn('flex items-center gap-3')}>
                    <Materwelon className={cn('drop-shadow-mark size-9')} />
                    <span className={cn('font-display text-xl font-semibold tracking-tight text-(--seed-dark)')}>
                        seedcord
                    </span>
                    <span
                        className={cn(
                            'font-mono-code ml-1 rounded-sm bg-(--vine-deep) px-1.5 py-0.5 text-[11px] font-semibold text-(--cream)'
                        )}
                    >
                        v1.0
                    </span>
                </Link>
                <div className={cn('flex items-center gap-2')}>
                    <nav aria-label="Primary" className={cn('flex items-center gap-1')}>
                        {LINKS.map((l) => (
                            <Link
                                key={l.label}
                                href={l.href}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                    'font-mono-code rounded-sm px-3 py-1.5 text-sm font-medium text-(--seed-dark) transition-colors hover:bg-(--seed-dark) hover:text-(--cream)'
                                )}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                    <PosterButton href={REPO_URL} variant="ink" className={cn('font-mono-code px-3 py-1.5 text-sm')}>
                        <Icon icon={GithubIcon} size={20} className={cn('md:hidden')} />
                        <span className={cn('sr-only md:not-sr-only')}>GitHub</span>
                    </PosterButton>
                </div>
            </div>
        </header>
    );
}
