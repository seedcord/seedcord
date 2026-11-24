import { cn } from 'cn';

import { PlainLink } from './lib/navLink';
import { pressable } from './lib/press';
import { Materwelon } from './Materwelon';
import { PosterButton } from './PosterButton';

import type { NavLinkComponent } from './lib/navLink';
import type { ReactNode } from 'react';

interface PosterNavLink {
    label: string;
    href: string;
    current?: boolean;
}

interface PosterNavProps {
    homeHref?: string;
    // the word after "seedcord" next to the logo, like "beta"
    tag?: string;
    // an ink button before the links. it shows at every width
    primary?: PosterNavLink;
    // hidden on a phone
    links?: readonly PosterNavLink[];
    actions?: ReactNode;
    linkAs?: NavLinkComponent;
}

const ariaCurrent = (link: PosterNavLink): 'page' | undefined => (link.current ? 'page' : undefined);

export function PosterNav({
    homeHref = '/',
    tag,
    primary,
    links = [],
    actions,
    linkAs: Link = PlainLink
}: PosterNavProps): ReactNode {
    return (
        <header className={cn('sticky top-0 z-50 border-b-[3px] border-(--seed-dark) bg-(--pith)')}>
            <div className={cn('mx-auto flex h-16 max-w-(--shell-max) items-center gap-2 px-5 max-[400px]:px-3')}>
                <Link href={homeHref} className={cn('order-1 flex items-center gap-3 max-[400px]:gap-2 sm:me-2')}>
                    <Materwelon className={cn('drop-shadow-mark size-9 max-[400px]:size-8')} />
                    <span
                        className={cn(
                            'font-display text-xl font-semibold tracking-tight whitespace-nowrap text-(--seed-dark) max-[400px]:text-lg'
                        )}
                    >
                        seedcord {tag ? <span className={cn('font-normal text-(--flesh-deep)')}>{tag}</span> : null}
                    </span>
                </Link>
                <nav aria-label="Primary" className={cn('contents')}>
                    {primary ? (
                        <PosterButton variant="ink" wrapperClassName={cn('order-3 sm:order-1')}>
                            <Link href={primary.href} aria-current={ariaCurrent(primary)}>
                                {primary.label}
                            </Link>
                        </PosterButton>
                    ) : null}
                    <span className={cn('order-3 hidden items-center gap-1 sm:flex')}>
                        {links.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                aria-current={ariaCurrent(link)}
                                className={cn(
                                    'font-mono-code rounded-sm px-3 py-1.5 text-sm font-medium text-(--seed-dark) hover:bg-(--seed-dark) hover:text-(--pith)',
                                    pressable
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </span>
                </nav>
                <span aria-hidden className={cn('order-2 flex-1')} />
                <span className={cn('order-4 flex items-center gap-2')}>{actions}</span>
            </div>
        </header>
    );
}
