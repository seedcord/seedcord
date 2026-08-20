import { GuideShell } from '#components/GuideShell';
import { GUIDE_TABS, sidebarsByTab } from '#lib/nav';

import { MOCK_TOC, MockArticle } from './mock';

import type { ReactElement } from 'react';

// the real shell picks its tab off the route, and no tab matches /dev
const PREVIEW_PATHNAME = '/tooling/';

function TocPage(): ReactElement {
    return (
        <GuideShell tabs={GUIDE_TABS} sidebars={sidebarsByTab()} toc={MOCK_TOC} pathname={PREVIEW_PATHNAME}>
            <MockArticle />
        </GuideShell>
    );
}

export default TocPage;
