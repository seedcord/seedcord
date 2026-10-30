import { GuideShell } from '#components/GuideShell.tsx';
import { GUIDE_TABS, sidebarsByTab } from '#lib/nav.ts';
import { pageActionsFor } from '#lib/pageActions.ts';
import { source } from '#lib/source.ts';

import type { ReactNode } from 'react';

interface LayoutProps {
    params: Promise<{ slug?: string[] }>;
    children: ReactNode;
}

// only a layout under the slug segment receives the slug
export default async function Layout({ params, children }: LayoutProps): Promise<ReactNode> {
    const { slug } = await params;
    const page = source.getPage(slug);

    return (
        <GuideShell
            tabs={GUIDE_TABS}
            sidebars={sidebarsByTab()}
            toc={page?.data.toc}
            pageTitle={page?.data.title}
            actions={page === undefined ? undefined : pageActionsFor(page)}
        >
            {children}
        </GuideShell>
    );
}
