import { cn, GithubIcon } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';
import Link from 'next/link';

import { GithubStars } from '#components/GithubStars';
import { NpmVersion } from '#components/NpmVersion';
import { PosterButton } from '#components/ui/PosterButton';
import { linkTarget } from '#components/ui/linkTarget';
import { pressable } from '#components/ui/press';
import { BLOG_PATH } from '#lib/blog/seo';
import { DOCS_URL, GUIDE_URL, REPO_URL } from '#lib/site';

import type { ReactNode } from 'react';

const BLOG = { label: 'Blog', href: BLOG_PATH } as const;
const SITES = [
    { label: 'Guide', href: GUIDE_URL },
    { label: 'Docs', href: DOCS_URL }
] as const;

type NavLabel = typeof BLOG.label | (typeof SITES)[number]['label'];

interface NavLinkProps {
    label: NavLabel;
    href: string;
    current: NavLabel | undefined;
    className?: string;
}

function NavLink({ label, href, current, className }: NavLinkProps): ReactNode {
    return (
        <Link
            href={href}
            {...linkTarget(href)}
            aria-current={label === current ? 'page' : undefined}
            className={cn(
                'font-mono-code rounded-sm px-3 py-1.5 text-sm font-medium text-(--seed-dark) hover:bg-(--seed-dark) hover:text-(--pith)',
                'aria-[current=page]:bg-(--seed-dark) aria-[current=page]:text-(--pith) aria-[current=page]:hover:bg-(--flesh-deep)',
                pressable,
                className
            )}
        >
            {label}
        </Link>
    );
}

interface NavProps {
    current?: NavLabel;
}

export function Nav({ current }: NavProps): ReactNode {
    return (
        <header className={cn('sticky top-0 z-50 border-b-[3px] border-(--seed-dark) bg-(--pith)')}>
            <div className={cn('mx-auto flex h-16 max-w-(--shell-max) items-center gap-2 px-5')}>
                <Link href="/" className={cn('order-1 flex items-center gap-3 sm:me-2')}>
                    <Materwelon className={cn('drop-shadow-mark size-9')} />
                    <span className={cn('font-display text-xl font-semibold tracking-tight text-(--seed-dark)')}>
                        seedcord
                    </span>
                </Link>
                <NavLink
                    {...BLOG}
                    current={current}
                    className={cn('order-3 bg-(--seed-dark) text-(--pith) hover:bg-(--flesh-deep) sm:order-1')}
                />
                <span aria-hidden className={cn('order-2 flex-1')} />
                <nav aria-label="Documentation" className={cn('order-3 hidden items-center gap-1 sm:flex')}>
                    {SITES.map((site) => (
                        <NavLink key={site.label} {...site} current={current} />
                    ))}
                </nav>
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
