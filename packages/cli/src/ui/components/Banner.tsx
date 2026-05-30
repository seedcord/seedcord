import { formatFilePath } from '@seedcord/utils';
import { Box, Text } from 'ink';
import React from 'react';

import type { Config } from '@seedcord/types';
import type { ReactElement } from 'react';

const SEED_COLOR = '#f04e36';
const CORD_COLOR = '#6fab49';

interface BannerProps {
    readonly config: Config | null;
}

function ConfigPath({ path }: { path: string | null | undefined }): ReactElement {
    if (!path) return <Text color="gray">Disabled</Text>;
    return <Text dimColor>{formatFilePath(path)}</Text>;
}

export function Banner({ config }: BannerProps): ReactElement {
    return (
        <Box flexDirection="column">
            <Text bold>
                <Text color={SEED_COLOR}>seed</Text>
                <Text color={CORD_COLOR}>cord</Text>
            </Text>
            {config && (
                <Box flexDirection="column" paddingTop={1}>
                    <Text>
                        <Text color="blue">➜</Text> Interactions: <ConfigPath path={config.bot.interactions.path} />
                    </Text>
                    <Text>
                        <Text color="blue">➜</Text> Events: <ConfigPath path={config.bot.events.path} />
                    </Text>
                    <Text>
                        <Text color="blue">➜</Text> Pub/Sub: <ConfigPath path={config.subscribers.path} />
                    </Text>
                </Box>
            )}
        </Box>
    );
}
