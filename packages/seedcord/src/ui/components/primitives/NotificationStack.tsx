import { Box } from 'ink';
import React, { Fragment } from 'react';

import type { Notice } from '@ui/notices';
import type { ReactElement } from 'react';

interface NotificationStackProps {
    readonly notices: readonly Notice[];
}

export function NotificationStack({ notices }: NotificationStackProps): ReactElement | null {
    if (notices.length === 0) return null;

    return (
        <Box flexShrink={0} flexDirection="column">
            {notices.map((notice) => (
                <Fragment key={notice.key}>{notice.card}</Fragment>
            ))}
        </Box>
    );
}
