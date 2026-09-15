import { cn } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';
import Link from 'next/link';

import {
    AUTHOR_GITHUB_URL,
    AUTHOR_URL,
    DISCORD_URL,
    DOCS_URL,
    GUIDE_URL,
    NPM_ORG_URL,
    REPO_URL,
    ROADMAP_URL
} from '#lib/site';

import type { ReactNode } from 'react';

const COLUMNS = [
    {
        title: 'Documentation',
        links: [
            { label: 'API reference', href: DOCS_URL },
            { label: 'Guide', href: GUIDE_URL }
        ]
    },
    {
        title: 'Community',
        links: [
            { label: 'npm org', href: NPM_ORG_URL },
            { label: 'Discord', href: DISCORD_URL },
            { label: 'GitHub', href: REPO_URL }
        ]
    },
    {
        title: 'Project',
        links: [
            { label: 'Roadmap', href: ROADMAP_URL },
            { label: 'Releases', href: `${REPO_URL}/releases` },
            { label: 'License', href: `${REPO_URL}/blob/main/LICENSE` },
            { label: 'Issues', href: `${REPO_URL}/issues` }
        ]
    }
] as const;

function LinkColumn({ column }: { column: (typeof COLUMNS)[number] }): ReactNode {
    return (
        <nav
            aria-label={column.title}
            className={cn(
                'grid grid-cols-[7.5rem_1fr] items-baseline border-t-[1.5px] border-(--seed-dark)/15 py-3',
                'lg:flex lg:flex-col lg:items-end lg:gap-3 lg:border-0 lg:py-0 lg:text-right'
            )}
        >
            <span className={cn('font-mono-code text-xs font-semibold tracking-wide text-(--seed-dark)/55 uppercase')}>
                {column.title}
            </span>
            <div className={cn('flex flex-wrap gap-x-4 gap-y-1.5 lg:contents')}>
                {column.links.map((l) => (
                    <Link
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className={cn('text-sm font-medium text-(--seed-dark) transition-colors hover:text-(--flesh)')}
                    >
                        {l.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}

export function Footer(): ReactNode {
    return (
        <footer className={cn('border-t-[3px] border-(--seed-dark) bg-(--pith)')}>
            <div className={cn('mx-auto max-w-(--shell-max) px-5 py-8 lg:py-14')}>
                <div className={cn('flex flex-col gap-7 lg:flex-row lg:justify-between lg:gap-10')}>
                    <div className={cn('flex flex-col gap-4')}>
                        <Link href="/" className={cn('flex items-center gap-3')}>
                            <Materwelon className={cn('drop-shadow-mark size-8')} />
                            <span
                                className={cn('font-display text-xl font-semibold tracking-tight text-(--seed-dark)')}
                            >
                                seedcord
                            </span>
                        </Link>
                        <p className={cn('max-w-xs text-sm font-medium text-(--seed-dark)/70')}>
                            A typed framework for Discord bots, wired on top of discord.js.
                        </p>
                    </div>
                    <div className={cn('flex flex-col lg:flex-row lg:gap-20')}>
                        {COLUMNS.map((col) => (
                            <LinkColumn key={col.title} column={col} />
                        ))}
                    </div>
                </div>
            </div>
            <div className={cn('border-t-[3px] border-(--seed-dark)')}>
                <div className={cn('mx-auto max-w-(--shell-max) px-5 py-6')}>
                    <p className={cn('font-mono-code text-xs text-(--seed-dark)/70')}>
                        Built by{' '}
                        <Link
                            href={AUTHOR_URL}
                            target="_blank"
                            rel="noreferrer"
                            className={cn('font-semibold text-(--seed-dark) transition-colors hover:text-(--flesh)')}
                        >
                            materwelonDhruv
                        </Link>
                        {' · '}
                        <Link
                            href={AUTHOR_GITHUB_URL}
                            target="_blank"
                            rel="noreferrer"
                            className={cn('text-(--seed-dark) transition-colors hover:text-(--flesh)')}
                        >
                            GitHub
                        </Link>
                    </p>
                </div>
            </div>
        </footer>
    );
}
