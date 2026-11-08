import { PRODUCTION_SITES } from '@seedcord/brand';
import { cn, GithubIcon } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';
import Link from 'next/link';

import { GithubStars } from '#components/GithubStars';
import { NpmVersion } from '#components/NpmVersion';
import { PosterButton } from '#components/ui/PosterButton';
import { pressable } from '#components/ui/press';
import { SiteLink } from '#components/ui/SiteLink';
import { BLOG_PATH } from '#lib/blog/paths';
import { GUIDE_URL, REPO_URL } from '#lib/site';

import type { ReactNode } from 'react';

const SITES = [
    { label: 'Guide', href: GUIDE_URL },
    { label: 'Docs', href: PRODUCTION_SITES.docs.url }
] as const;

function NavLink({ label, href }: (typeof SITES)[number]): ReactNode {
    return (
        <SiteLink
            href={href}
            className={cn(
                'font-mono-code rounded-sm px-3 py-1.5 text-sm font-medium text-(--seed-dark) hover:bg-(--seed-dark) hover:text-(--pith)',
                pressable
            )}
        >
            {label}
        </SiteLink>
    );
}

interface NavProps {
    onBlogIndex?: boolean;
}

export function Nav({ onBlogIndex = false }: NavProps): ReactNode {
    return (
        <header className={cn('sticky top-0 z-50 border-b-[3px] border-(--seed-dark) bg-(--pith)')}>
            <div className={cn('mx-auto flex h-16 max-w-(--shell-max) items-center gap-2 px-5')}>
                <Link href="/" className={cn('order-1 flex items-center gap-3 sm:me-2')}>
                    <Materwelon className={cn('drop-shadow-mark size-9')} />
                    <span className={cn('font-display text-xl font-semibold tracking-tight text-(--seed-dark)')}>
                        seedcord
                    </span>
                </Link>
                <nav aria-label="Primary" className={cn('contents')}>
                    <PosterButton
                        href={BLOG_PATH}
                        variant="ink"
                        current={onBlogIndex}
                        wrapperClassName={cn('order-3 sm:order-1')}
                    >
                        Blog
                    </PosterButton>
                    <span className={cn('order-3 hidden items-center gap-1 sm:flex')}>
                        {SITES.map((site) => (
                            <NavLink key={site.label} {...site} />
                        ))}
                    </span>
                </nav>
                <span aria-hidden className={cn('order-2 flex-1')} />
                <span className={cn('order-4 flex items-center gap-2')}>
                    <NpmVersion />
                    <PosterButton href={REPO_URL} variant="ink">
                        <GithubIcon variant="mark" size={20} aria-hidden className={cn('shrink-0 md:hidden')} />
                        <span className={cn('sr-only md:not-sr-only')}>GitHub</span>
                        <GithubStars />
                    </PosterButton>
                </span>
            </div>
        </header>
    );
}
