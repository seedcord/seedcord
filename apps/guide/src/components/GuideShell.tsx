'use client';

import { MAIN_CONTENT_ID, MobilePanel, ScrollToTopButton, cn, matchActiveHref, tw } from '@seedcord/ui';
import { AnchorProvider, useActiveAnchor } from 'fumadocs-core/toc';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useVisibleHeadingIds } from '#lib/visibleHeadings';

import { DocsSidebar } from './DocsSidebar';
import { GithubLink, GuideNavbar } from './GuideNavbar';
import { MobileNav } from './MobileNav';
import { PageActions } from './PageActions';
import { StarCard } from './StarCard';
import { idOf, TableOfContents } from './TableOfContents';
import { TocBar } from './TocBar';
import { useScrollMemory } from './useScrollMemory';

import type { GuideTab, SidebarsByTab } from '#lib/nav';
import type { PageNeighbours } from '#lib/neighbours';
import type { PageActionProps } from '#lib/pageActions';
import type { TocBarProps } from './TocBar';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { Except } from 'type-fest';
import type { ReactElement, ReactNode } from 'react';

const NO_TOC: readonly TOCItemType[] = [];

function ContentsBar({ items, pageTitle }: Except<TocBarProps, 'activeIds' | 'currentId' | 'className'>): ReactElement {
    const activeIds = useVisibleHeadingIds(items);
    const currentId = useActiveAnchor();

    return (
        <TocBar
            items={items}
            activeIds={activeIds}
            currentId={currentId}
            pageTitle={pageTitle}
            className={cn('sticky top-(--nav-h) z-40 lg:hidden')}
        />
    );
}

// 214px is the column width in the guide layouts mock
const contentsColumnClassName = tw`sticky top-(--nav-h) hidden max-h-[calc(100dvh-var(--nav-h))] w-53.5 shrink-0 flex-col gap-4 self-start py-10 lg:flex`;

// a ghost row spans the column with its icon on the left edge
const ghostRow = tw`-ms-(--ghost-row-pull) self-stretch`;

const mainClassName = tw`min-w-0 flex-1 scroll-mt-(--nav-h) pt-10 pb-(--jump-clearance) lg:pb-10`;

function ContentsColumn({
    items,
    actions
}: {
    items: readonly TOCItemType[];
    actions: PageActionProps | undefined;
}): ReactElement {
    const activeIds = useVisibleHeadingIds(items);

    return (
        <div className={cn(contentsColumnClassName)}>
            {actions === undefined ? null : <PageActions {...actions} className={cn(ghostRow)} />}
            <TableOfContents items={items} activeIds={activeIds} className={cn('min-h-0')} />
            <ScrollToTopButton variant="inline" className={cn(ghostRow, 'justify-start')} />
            <StarCard />
        </div>
    );
}

export interface GuideShellProps {
    tabs: readonly GuideTab[];
    sidebars: SidebarsByTab;
    toc?: readonly TOCItemType[] | undefined;
    pageTitle?: string | undefined;
    actions?: PageActionProps | undefined;
    neighbours?: PageNeighbours | undefined;
    pathname?: string | undefined;
    children: ReactNode;
}

const NO_NEIGHBOURS: PageNeighbours = {};

export function GuideShell({
    tabs,
    sidebars,
    toc = NO_TOC,
    pageTitle = '',
    actions,
    neighbours = NO_NEIGHBOURS,
    pathname: override,
    children
}: GuideShellProps): ReactElement {
    const current = usePathname();
    const pathname = override ?? current;
    useScrollMemory(pathname);
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
        <AnchorProvider toc={anchors}>
            <GuideNavbar
                targets={{
                    tabs,
                    activeHref: activeHref ?? '',
                    neighbours,
                    headingIds: toc.map((item) => idOf(item.url))
                }}
                navOpen={navOpen}
                onNavOpen={() => setNavOpen(true)}
            />

            <div className={cn('pt-(--nav-h)')}>
                {hasContents ? <ContentsBar items={toc} pageTitle={pageTitle} /> : null}
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
                    {/* below lg the floating button would cover PageNav */}
                    <main id={MAIN_CONTENT_ID} className={cn(mainClassName)}>
                        {children}
                    </main>
                    {hasContents ? <ContentsColumn items={toc} actions={actions} /> : null}
                </div>
            </div>
            {/* the contents column carries its own from lg up */}
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
                    activeHref={activeHref ?? ''}
                    sidebars={sidebars}
                    pathname={pathname}
                    onNavigate={() => setNavOpen(false)}
                />
            </MobilePanel>
        </AnchorProvider>
    );
}
