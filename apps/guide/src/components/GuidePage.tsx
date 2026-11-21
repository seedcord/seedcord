'use client';

import { MAIN_CONTENT_ID, ScrollToTopButton, cn, tw } from '@seedcord/ui';
import { useActiveAnchor } from 'fumadocs-core/toc';
import { useLayoutEffect } from 'react';

import { useVisibleHeadingIds } from '#lib/visibleHeadings';

import { useShowPage } from './GuideShell';
import { PageActions } from './PageActions';
import { StarCard } from './StarCard';
import { TableOfContents } from './TableOfContents';
import { TocBar } from './TocBar';

import type { ShownPage } from './GuideShell';
import type { TocBarProps } from './TocBar';
import type { PageActionProps } from '#lib/pageActions';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactElement, ReactNode } from 'react';
import type { Except } from 'type-fest';

// -mx undoes the shell's gutter to stretch the bar edge to edge
const contentsBarClassName = tw`sticky top-(--nav-h) z-40 -mx-(--page-gutter) lg:hidden`;

function ContentsBar({ items, pageTitle }: Except<TocBarProps, 'activeIds' | 'currentId' | 'className'>): ReactElement {
    const activeIds = useVisibleHeadingIds(items);
    const currentId = useActiveAnchor();

    return (
        <TocBar
            items={items}
            activeIds={activeIds}
            currentId={currentId}
            pageTitle={pageTitle}
            className={cn(contentsBarClassName)}
        />
    );
}

// 214px is the column width in the guide layouts mock
const contentsColumnClassName = tw`sticky top-(--nav-h) hidden max-h-[calc(100dvh-var(--nav-h))] w-53.5 shrink-0 flex-col gap-4 self-start py-10 lg:flex`;

// a ghost row spans the column with its icon on the left edge
const ghostRow = tw`-ms-(--ghost-row-pull) self-stretch`;

// below lg the floating jump button would cover PageNav without the jump clearance
const mainClassName = tw`min-w-0 flex-1 scroll-mt-(--nav-h) pt-10 pb-(--jump-clearance) lg:pb-10`;

function ContentsColumn({ items, actions }: { items: readonly TOCItemType[]; actions: PageActionProps }): ReactElement {
    const activeIds = useVisibleHeadingIds(items);

    return (
        <div className={cn(contentsColumnClassName)}>
            <PageActions {...actions} className={cn(ghostRow)} />
            <TableOfContents items={items} activeIds={activeIds} className={cn('min-h-0')} />
            <ScrollToTopButton variant="inline" className={cn(ghostRow, 'justify-start')} />
            <StarCard />
        </div>
    );
}

export interface GuidePageProps extends ShownPage {
    pageTitle: string;
    actions: PageActionProps;
    children: ReactNode;
}

export function GuidePage({ toc, neighbours, pageTitle, actions, children }: GuidePageProps): ReactElement {
    const showPage = useShowPage();
    const hasContents = toc.length > 0;

    // layout effect because the navbar's page keys step through the old page's headings until this runs
    useLayoutEffect(() => {
        showPage({ toc, neighbours });
    }, [showPage, toc, neighbours]);

    return (
        <>
            {hasContents ? <ContentsBar items={toc} pageTitle={pageTitle} /> : null}
            <div className={cn('flex gap-10')}>
                <main id={MAIN_CONTENT_ID} className={cn(mainClassName)}>
                    {children}
                </main>
                {hasContents ? <ContentsColumn items={toc} actions={actions} /> : null}
            </div>
        </>
    );
}
