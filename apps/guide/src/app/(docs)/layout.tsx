import { DocsLayout } from 'fumadocs-ui/layouts/docs';

import { SITE_NAME } from '#lib/site';
import { source } from '#lib/source';

import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }): ReactNode {
    return (
        <DocsLayout tree={source.getPageTree()} nav={{ title: SITE_NAME }}>
            {children}
        </DocsLayout>
    );
}
