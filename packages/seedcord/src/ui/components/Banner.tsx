import { Text } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

const SEED_COLOR = '#f04e36';
const CORD_COLOR = '#6fab49';
const VERSION_COLOR = '#f7f5e8';

interface BannerProps {
    readonly version: string | null;
}

export function Banner({ version }: BannerProps): ReactElement {
    return (
        <Text>
            <Text bold color={SEED_COLOR}>
                seed
            </Text>
            <Text bold color={CORD_COLOR}>
                cord
            </Text>
            {version === null ? null : <Text color={VERSION_COLOR}> • v{version}</Text>}
        </Text>
    );
}
