import { Box } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

// full-width flex line bracketing a block. flexShrink={0} keeps the border-only box from compressing to
// zero height under overflow, which would land the rule on the neighbouring text line.
export function Rule(): ReactElement {
    return (
        <Box
            flexShrink={0}
            borderStyle="single"
            borderTop
            borderBottom={false}
            borderLeft={false}
            borderRight={false}
            borderDimColor
        />
    );
}
