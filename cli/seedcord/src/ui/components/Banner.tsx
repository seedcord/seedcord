import { BRAND } from '@seedcord/errors/internal';
import { Text } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

interface BannerProps {
    readonly version: string | null;
}

export function Banner({ version }: BannerProps): ReactElement {
    return (
        <Text>
            <Text bold color={BRAND.flesh}>
                seed
            </Text>
            <Text bold color={BRAND.rind}>
                cord
            </Text>
            {version === null ? null : <Text color={BRAND.pith}> • v{version}</Text>}
        </Text>
    );
}
