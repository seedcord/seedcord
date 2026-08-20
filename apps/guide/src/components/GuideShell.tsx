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
import { AnchorProvider, useActiveAnchors } from 'fumadocs-core/toc';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

import { DOCS_URL, HOME_URL, REPO_URL, SITE_URL } from '#lib/site';

import { DocsSidebar } from './DocsSidebar';
import { MobileNav } from './MobileNav';
import { TableOfContents } from './TableOfContents';
import { TocBar } from './TocBar';

import type { GuideTab, SidebarsByTab } from '#lib/nav';
import type { SiteDestination } from '@seedcord/ui';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactElement, ReactNode } from 'react';

const DESTINATIONS: readonly SiteDestination[] = [
    { label: 'Home', href: HOME_URL },
    { label: 'Guide', href: SITE_URL, current: true },
    { label: 'Reference', href: DOCS_URL }
];

const NO_TOC: readonly TOCItemType[] = [];

function GithubLink(): ReactElement {
    return (
        <Button asChild variant="ghost" size="icon" aria-label="Open GitHub repository" className={cn('text-(--text)')}>
            <Link href={REPO_URL} target="_blank" rel="noreferrer">
                <Icon icon={GithubIcon} size={20} />
            </Link>
        </Button>
    );
}

function ContentsBar({ items }: { items: readonly TOCItemType[] }): ReactElement {
    const activeIds = useActiveAnchors();

    return <TocBar items={items} activeIds={activeIds} className={cn('sticky top-(--nav-h) z-40 lg:hidden')} />;
}

function ContentsColumn({ items }: { items: readonly TOCItemType[] }): ReactElement {
    const activeIds = useActiveAnchors();

    return (
        <TableOfContents
            items={items}
            activeIds={activeIds}
            className={cn('top-(--nav-h) hidden max-h-[calc(100dvh-var(--nav-h))] py-10 lg:block')}
        />
    );
}

export interface GuideShellProps {
    tabs: readonly GuideTab[];
    sidebars: SidebarsByTab;
    toc?: readonly TOCItemType[] | undefined;
    /** The dev preview passes one, since no tab matches its own route. */
    pathname?: string | undefined;
    children: ReactNode;
}

export function GuideShell({
    tabs,
    sidebars,
    toc = NO_TOC,
    pathname: override,
    children
}: GuideShellProps): ReactElement {
    const current = usePathname();
    const pathname = override ?? current;
    const [navOpen, setNavOpen] = useState(false);
    // AnchorProvider re-observes every heading whenever this array changes identity
    const anchors = useMemo(() => [...toc], [toc]);

    const activeHref = matchActiveHref(
        pathname,
        tabs.map((tab) => tab.href)
    );
    const sections = activeHref === undefined ? [] : (sidebars[activeHref] ?? []);
    const hasContents = toc.length > 0;

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
                tabsClassName={cn('hidden lg:flex')}
                tabs={<NavTabs items={tabs} activeHref={activeHref ?? ''} linkAs={Link} />}
            />

            <AnchorProvider toc={anchors}>
                <div style={{ paddingTop: 'var(--nav-h)' }}>
                    {hasContents ? <ContentsBar items={toc} /> : null}
                    <div className={cn('mx-auto flex w-full max-w-(--content-max) gap-10 px-4 md:px-6')}>
                        {sections.length > 0 ? (
                            <DocsSidebar
                                sections={sections}
                                activeHref={pathname}
                                className={cn(
                                    'nice-scroll sticky top-(--nav-h) hidden h-[calc(100dvh-var(--nav-h))] w-64 shrink-0 overflow-y-auto py-10 lg:block'
                                )}
                            />
                        ) : null}
                        <main id="main-content" className={cn('min-w-0 flex-1 py-10')}>
                            {children}
                        </main>
                        {hasContents ? <ContentsColumn items={toc} /> : null}
                    </div>
                </div>
            </AnchorProvider>

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
