import { GuideShell } from '#components/GuideShell';
import { GUIDE_TABS, sidebarsByTab } from '#lib/nav';

import type { ReactNode } from 'react';

// the shell is up here because next remounts any layout under [[...slug]] on every page change
export default function Layout({ children }: { children: ReactNode }): ReactNode {
    return (
        <GuideShell tabs={GUIDE_TABS} sidebars={sidebarsByTab()}>
            {children}
        </GuideShell>
    );
}
