import { BRAND_COLORS } from '@seedcord/brand';
import { Text } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

interface BannerProps {
    readonly version: string | null;
}

export function Banner({ version }: BannerProps): ReactElement {
    return (
        <Text>
            <Text bold color={BRAND_COLORS.flesh}>
                seed
            </Text>
            <Text bold color={BRAND_COLORS.rind}>
                cord
            </Text>
            {version === null ? null : <Text color={BRAND_COLORS.pith}> • v{version}</Text>}
        </Text>
    );
}
