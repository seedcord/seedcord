import { cn } from 'cn';

import { PlainLink } from './lib/navLink';
import { Materwelon } from './Materwelon';

import type { NavLinkComponent } from './lib/navLink';
import type { ReactNode } from 'react';

interface PosterFooterColumn {
    title: string;
    links: readonly { label: string; href: string }[];
}

interface PosterFooterProps {
    homeHref?: string;
    tagline: string;
    columns: readonly PosterFooterColumn[];
    // the line in the bottom bar, like who built the site
    credit?: ReactNode;
    linkAs?: NavLinkComponent;
}

export function PosterFooter({
    homeHref = '/',
    tagline,
    columns,
    credit,
    linkAs: Link = PlainLink
}: PosterFooterProps): ReactNode {
    return (
        <footer className={cn('border-t-[3px] border-(--seed-dark) bg-(--pith)')}>
            <div className={cn('mx-auto max-w-(--shell-max) px-5 py-8 lg:py-14')}>
                <div className={cn('flex flex-col gap-7 lg:flex-row lg:justify-between lg:gap-10')}>
                    <div className={cn('flex flex-col gap-4')}>
                        <Link href={homeHref} className={cn('flex items-center gap-3')}>
                            <Materwelon className={cn('drop-shadow-mark size-8')} />
                            <span
                                className={cn('font-display text-xl font-semibold tracking-tight text-(--seed-dark)')}
                            >
                                seedcord
                            </span>
                        </Link>
                        <p className={cn('max-w-xs text-sm font-medium text-(--seed-dark)/70')}>{tagline}</p>
                    </div>
                    <div className={cn('flex flex-col lg:flex-row lg:gap-20')}>
                        {columns.map((column) => (
                            <nav
                                key={column.title}
                                aria-label={column.title}
                                className={cn(
                                    'grid grid-cols-[7.5rem_1fr] items-baseline border-t-[1.5px] border-(--seed-dark)/15 py-3',
                                    'lg:flex lg:flex-col lg:items-end lg:gap-3 lg:border-0 lg:py-0 lg:text-right'
                                )}
                            >
                                <span
                                    className={cn(
                                        'font-mono-code text-xs font-semibold tracking-wide text-(--seed-dark)/55 uppercase'
                                    )}
                                >
                                    {column.title}
                                </span>
                                <div className={cn('flex flex-wrap gap-x-4 gap-y-1.5 lg:contents')}>
                                    {column.links.map((link) => (
                                        <Link
                                            key={link.label}
                                            href={link.href}
                                            className={cn(
                                                'text-sm font-medium text-(--seed-dark) transition-colors hover:text-(--flesh)'
                                            )}
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>
                            </nav>
                        ))}
                    </div>
                </div>
            </div>
            {credit ? (
                <div className={cn('border-t-[3px] border-(--seed-dark)')}>
                    <div className={cn('mx-auto max-w-(--shell-max) px-5 py-6')}>
                        <p className={cn('font-mono-code text-xs text-(--seed-dark)/70')}>{credit}</p>
                    </div>
                </div>
            ) : null}
        </footer>
    );
}
