import type { ReactNode } from 'react';

// the sidebar is built in packages/[packageId]/[versionId]/layout.tsx because it needs the
// [packageId]/[versionId] params that a route-group layout never receives
function DocsLayout({ children }: { children: ReactNode }): ReactNode {
    return children;
}

export default DocsLayout;
