import { GuideShell } from '#components/GuideShell';
import { GUIDE_TABS, sidebarsByTab } from '#lib/nav';
import { source } from '#lib/source';

import type { ReactNode } from 'react';

interface LayoutProps {
    params: Promise<{ slug?: string[] }>;
    children: ReactNode;
}

// sits inside the slug segment to reach page.data.toc
export default async function Layout({ params, children }: LayoutProps): Promise<ReactNode> {
    const { slug } = await params;
    const page = source.getPage(slug);

    return (
        <GuideShell tabs={GUIDE_TABS} sidebars={sidebarsByTab()} toc={page?.data.toc}>
            {children}
        </GuideShell>
    );
}
