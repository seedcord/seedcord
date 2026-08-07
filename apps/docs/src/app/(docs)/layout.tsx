import type { ReactNode } from 'react';

// the sidebar needs [packageId]/[versionId] params that a route-group layout never receives, so it
// is built in packages/[packageId]/[versionId]/layout.tsx
function DocsLayout({ children }: { children: ReactNode }): ReactNode {
    return children;
}

export default DocsLayout;
