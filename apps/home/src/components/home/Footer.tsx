import { cn } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';
import Link from 'next/link';

import { DISCORD_URL, DOCS_URL, GUIDE_URL, NPM_URL, REPO_URL } from '#lib/site';

import type { ReactNode } from 'react';

const COLUMNS = [
    {
        title: 'Documentation',
        links: [
            { label: 'Guide', href: GUIDE_URL },
            { label: 'API reference', href: DOCS_URL }
        ]
    },
    {
        title: 'Community',
        links: [
            { label: 'Discord', href: DISCORD_URL },
            { label: 'GitHub', href: REPO_URL },
            { label: 'npm', href: NPM_URL }
        ]
    },
    {
        title: 'Project',
        links: [
            { label: 'Releases', href: `${REPO_URL}/releases` },
            { label: 'Issues', href: `${REPO_URL}/issues` },
            { label: 'License', href: `${REPO_URL}/blob/main/LICENSE` }
        ]
    }
] as const;

export function Footer(): ReactNode {
    return (
        <footer className={cn('border-t-[3px] border-(--seed-dark) bg-(--pith)')}>
            <div className={cn('mx-auto max-w-(--shell-max) px-5 py-14')}>
                <div className={cn('grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]')}>
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
                    <div className={cn('grid grid-cols-3 gap-6 lg:contents')}>
                        {COLUMNS.map((col) => (
                            <nav key={col.title} aria-label={col.title} className={cn('flex flex-col gap-3')}>
                                <span
                                    className={cn(
                                        'font-mono-code text-xs font-semibold tracking-wide text-(--seed-dark)/55 uppercase'
                                    )}
                                >
                                    {col.title}
                                </span>
                                {col.links.map((l) => (
                                    <Link
                                        key={l.label}
                                        href={l.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cn(
                                            'text-sm font-medium text-(--seed-dark) transition-colors hover:text-(--flesh)'
                                        )}
                                    >
                                        {l.label}
                                    </Link>
                                ))}
                            </nav>
                        ))}
                    </div>
                </div>
            </div>
            <div className={cn('border-t-[3px] border-(--seed-dark)')}>
                <div className={cn('mx-auto max-w-(--shell-max) px-5 py-6')}>
                    <p className={cn('font-mono-code text-xs text-(--seed-dark)/70')}>
                        Built by{' '}
                        <Link
                            href="https://github.com/materwelonDhruv"
                            target="_blank"
                            rel="noreferrer"
                            className={cn('font-semibold text-(--seed-dark) transition-colors hover:text-(--flesh)')}
                        >
                            materwelonDhruv
                        </Link>
                    </p>
                </div>
            </div>
        </footer>
    );
}
