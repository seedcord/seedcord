'use client';

import {
    Button,
    GithubIcon,
    Icon,
    MobileNavButton,
    MobilePanel,
    Navbar,
    NavTabs,
    SiteSwitcher,
    ThemeToggle,
    cn,
    matchActiveHref
} from '@seedcord/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { DOCS_URL, HOME_URL, REPO_URL, SITE_URL } from '#lib/site';

import { DocsSidebar } from './DocsSidebar';
import { MobileNav } from './MobileNav';

import type { GuideTab, SidebarsByTab } from '#lib/nav';
import type { SiteDestination } from '@seedcord/ui';
import type { ReactElement, ReactNode } from 'react';

const DESTINATIONS: readonly SiteDestination[] = [
    { label: 'Home', href: HOME_URL },
    { label: 'Guide', href: SITE_URL, current: true },
    { label: 'Reference', href: DOCS_URL }
];

function GithubLink(): ReactElement {
    return (
        <Button asChild variant="ghost" size="icon" aria-label="Open GitHub repository" className={cn('text-(--text)')}>
            <Link href={REPO_URL} target="_blank" rel="noreferrer">
                <Icon icon={GithubIcon} size={20} />
            </Link>
        </Button>
    );
}

export interface GuideShellProps {
    tabs: readonly GuideTab[];
    sidebars: SidebarsByTab;
    children: ReactNode;
}

export function GuideShell({ tabs, sidebars, children }: GuideShellProps): ReactElement {
    const pathname = usePathname();
    const [navOpen, setNavOpen] = useState(false);

    const activeHref = matchActiveHref(
        pathname,
        tabs.map((tab) => tab.href)
    );
    const sections = activeHref === undefined ? [] : (sidebars[activeHref] ?? []);

    return (
        <>
            <Navbar
                mark={<SiteSwitcher site="guide" destinations={DESTINATIONS} linkAs={Link} />}
                actions={
                    <>
                        <ThemeToggle />
                        <span className={cn('hidden lg:flex')}>
                            <GithubLink />
                        </span>
                        <MobileNavButton open={navOpen} onOpen={() => setNavOpen(true)} className={cn('lg:hidden')} />
                    </>
                }
                tabs={
                    <NavTabs
                        items={tabs}
                        activeHref={activeHref ?? ''}
                        linkAs={Link}
                        className={cn('hidden lg:flex')}
                    />
                }
            />

            <div
                className={cn('mx-auto flex w-full max-w-(--content-max) gap-10 px-4 md:px-6')}
                style={{ paddingTop: 'var(--nav-h)' }}
            >
                {sections.length > 0 ? (
                    <DocsSidebar
                        sections={sections}
                        activeHref={pathname}
                        className={cn(
                            'nice-scroll sticky hidden h-[calc(100dvh-var(--nav-h))] w-64 shrink-0 overflow-y-auto py-10 lg:block'
                        )}
                    />
                ) : null}
                <main className={cn('min-w-0 flex-1 py-10')}>{children}</main>
            </div>

            <MobilePanel
                open={navOpen}
                onOpenChange={setNavOpen}
                title="Navigation"
                description="Slide-in navigation panel for the guide."
                footer={
                    <div className={cn('flex items-center justify-end gap-2')}>
                        <GithubLink />
                    </div>
                }
            >
                <MobileNav
                    tabs={tabs}
                    activeHref={activeHref ?? ''}
                    sidebars={sidebars}
                    pathname={pathname}
                    onNavigate={() => setNavOpen(false)}
                />
            </MobilePanel>
        </>
    );
}
