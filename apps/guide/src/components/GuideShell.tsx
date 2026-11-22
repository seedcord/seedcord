'use client';

import { MobilePanel, ScrollToTopButton, cn, matchActiveHref } from '@seedcord/ui';
import { AnchorProvider } from 'fumadocs-core/toc';
import { usePathname } from 'next/navigation';
import { createContext, use, useState } from 'react';

import { DocsSidebar } from './DocsSidebar';
import { GithubLink, GuideNavbar } from './GuideNavbar';
import { MobileNav } from './MobileNav';
import { idOf } from './TableOfContents';
import { useScrollMemory } from './useScrollMemory';
import { useTabMemory } from './useTabMemory';

import type { GuideTab, SidebarsByTab } from '#lib/nav';
import type { PageNeighbours } from '#lib/neighbours';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactElement, ReactNode } from 'react';

// what the navbar's page keys and the anchor tracking read from the page on screen
export interface ShownPage {
    toc: TOCItemType[];
    neighbours: PageNeighbours;
}

const NO_PAGE: ShownPage = { toc: [], neighbours: {} };

type ShowPage = (page: ShownPage) => void;

const ShownPageContext = createContext<ShowPage | null>(null);

export function useShowPage(): ShowPage {
    const setShown = use(ShownPageContext);
    if (!setShown) throw new Error('useShowPage must be called inside <GuideShell>');
    return setShown;
}

export interface GuideShellProps {
    tabs: readonly GuideTab[];
    sidebars: SidebarsByTab;
    children: ReactNode;
}

export function GuideShell({ tabs, sidebars, children }: GuideShellProps): ReactElement {
    const pathname = usePathname();
    useScrollMemory(pathname);
    const [navOpen, setNavOpen] = useState(false);
    const [shown, setShown] = useState(NO_PAGE);

    const activeHref =
        matchActiveHref(
            pathname,
            tabs.map((tab) => tab.href)
        ) ?? '';
    const sections = sidebars[activeHref] ?? [];
    const lastPageOf = useTabMemory(activeHref, pathname);

    return (
        <ShownPageContext value={setShown}>
            <AnchorProvider toc={shown.toc}>
                <GuideNavbar
                    targets={{
                        tabs: tabs.map((tab) => ({ label: tab.label, href: lastPageOf(tab.href) })),
                        activeHref: lastPageOf(activeHref),
                        neighbours: shown.neighbours,
                        headingIds: shown.toc.map((item) => idOf(item.url))
                    }}
                    navOpen={navOpen}
                    onNavOpen={() => setNavOpen(true)}
                />

                <div className={cn('pt-(--nav-h)')}>
                    <div className={cn('mx-auto flex w-full max-w-(--content-max) gap-10 px-(--page-gutter)')}>
                        {sections.length > 0 ? (
                            <DocsSidebar
                                sections={sections}
                                activeHref={pathname}
                                className={cn(
                                    'nice-scroll sticky top-(--nav-h) hidden h-[calc(100dvh-var(--nav-h))] w-64 shrink-0 overflow-y-auto py-10 lg:block'
                                )}
                            />
                        ) : null}
                        <div className={cn('min-w-0 flex-1')}>{children}</div>
                    </div>
                </div>
                {/* from lg up, the contents column renders its own button */}
                <ScrollToTopButton className={cn('right-(--page-gutter) lg:hidden')} />

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
                        activeHref={activeHref}
                        sidebars={sidebars}
                        pathname={pathname}
                        onNavigate={() => setNavOpen(false)}
                    />
                </MobilePanel>
            </AnchorProvider>
        </ShownPageContext>
    );
}
