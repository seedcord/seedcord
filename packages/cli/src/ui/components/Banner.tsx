import { formatFilePath } from '@seedcord/utils';
import { Box, Text } from 'ink';
import React from 'react';

import type { Config } from '@seedcord/types';
import type { ReactElement } from 'react';

const SEED_COLOR = '#f04e36';
const CORD_COLOR = '#6fab49';

interface BannerProps {
    readonly config: Config | null;
    // Drops the config paths; Sidebar sets this when the rail is too short for them.
    readonly compact?: boolean;
}

function ConfigPath({ path }: { path: string | null | undefined }): ReactElement {
    if (!path) return <Text color="gray">Disabled</Text>;
    return <Text dimColor>{formatFilePath(path)}</Text>;
}

function Wordmark(): ReactElement {
    return (
        <Text bold>
            <Text color={SEED_COLOR}>seed</Text>
            <Text color={CORD_COLOR}>cord</Text>
        </Text>
    );
}

export function Banner({ config, compact = false }: BannerProps): ReactElement {
    if (compact || !config) return <Wordmark />;

    return (
        <Box flexDirection="column">
            <Wordmark />
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
        </Box>
    );
}
