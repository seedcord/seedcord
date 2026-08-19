import { cn, GithubIcon, Icon } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';
import Link from 'next/link';

import { GithubStars } from '#components/GithubStars';
import { NpmVersion } from '#components/NpmVersion';
import { PosterButton } from '#components/ui/PosterButton';
import { pressable } from '#components/ui/press';
import { DOCS_URL, GUIDE_URL, REPO_URL } from '#lib/site';

import type { ReactNode } from 'react';

const LINKS = [
    { label: 'Guide', href: GUIDE_URL },
    { label: 'Docs', href: DOCS_URL }
] as const;

export function Nav(): ReactNode {
    return (
        <header className={cn('sticky top-0 z-50 border-b-[3px] border-(--seed-dark) bg-(--pith)')}>
            <div className={cn('mx-auto flex h-16 max-w-(--shell-max) items-center justify-between px-5')}>
                <div className={cn('flex items-center gap-3')}>
                    <Link href="/" className={cn('flex items-center gap-3')}>
                        <Materwelon className={cn('drop-shadow-mark size-9')} />
                        <span className={cn('font-display text-xl font-semibold tracking-tight text-(--seed-dark)')}>
                            seedcord
                        </span>
                    </Link>
                    <NpmVersion />
                </div>
                <div className={cn('flex items-center gap-2')}>
                    <nav aria-label="Primary" className={cn('hidden items-center gap-1 sm:flex')}>
                        {LINKS.map((l) => (
                            <Link
                                key={l.label}
                                href={l.href}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                    'font-mono-code rounded-sm px-3 py-1.5 text-sm font-medium text-(--seed-dark) hover:bg-(--seed-dark) hover:text-(--pith)',
                                    pressable
                                )}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                    <PosterButton href={REPO_URL} variant="ink" className={cn('font-mono-code px-3 py-1.5 text-sm')}>
                        <Icon icon={GithubIcon} size={20} className={cn('md:hidden')} />
                        <span className={cn('sr-only md:not-sr-only')}>GitHub</span>
                        <GithubStars />
                    </PosterButton>
                </div>
            </div>
        </header>
    );
}
