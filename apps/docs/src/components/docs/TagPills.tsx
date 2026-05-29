import { Badge } from '@seedcord/ui';

import type { ReactElement } from 'react';

function TagPills({ tags }: { tags: readonly string[] }): ReactElement | null {
    if (!tags.length) return null;

    return (
        <>
            {tags.includes('internal') ? <Badge tone="muted">Internal</Badge> : null}
            {tags.includes('decorator') ? <Badge tone="muted">Decorator</Badge> : null}
        </>
    );
}

export default TagPills;
