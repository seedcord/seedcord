import { LEVEL_COLOR } from '@seedcord/logger';
import { Box, Text } from 'ink';
import React from 'react';

import { channelColor } from '@ui/channelColor';
import { focusedIn } from '@ui/filterCursor';
import { ui } from '@ui/palette';

import type { LogLevel } from '@seedcord/logger';
import type { FilterCursor } from '@ui/filterCursor';
import type { ReactElement } from 'react';

export const FILTER_LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace'];

interface FilterChipsProps {
    readonly channels: readonly string[];
    readonly enabledChannels: ReadonlySet<string>;
    readonly enabledLevels: ReadonlySet<LogLevel>;
    readonly cursor: FilterCursor | null;
}

function Chip({
    label,
    on,
    color,
    focused
}: {
    label: string;
    on: boolean;
    color: string;
    focused: boolean;
}): ReactElement {
    return (
        <Box marginRight={1}>
            {on ? (
                <Text color={color} bold={focused} underline={focused}>
                    {label}
                </Text>
            ) : (
                <Text dimColor bold={focused} underline={focused}>
                    {label}
                </Text>
            )}
        </Box>
    );
}

// empty enabled set means all
export function FilterChips({ channels, enabledChannels, enabledLevels, cursor }: FilterChipsProps): ReactElement {
    const allChannels = enabledChannels.size === 0;
    const allLevels = enabledLevels.size === 0;
    const channelFocus = focusedIn(cursor, 'channels', channels.length);
    const levelFocus = focusedIn(cursor, 'levels', FILTER_LEVELS.length);

    return (
        <Box flexDirection="column">
            <Text bold color={ui.heading}>
                - channels
            </Text>
            <Box marginLeft={2} flexWrap="wrap">
                {channels.map((channel, index) => (
                    <Chip
                        key={channel}
                        label={channel}
                        on={allChannels || enabledChannels.has(channel)}
                        color={channelColor(channel)}
                        focused={channelFocus === index}
                    />
                ))}
            </Box>

            <Text bold color={ui.heading}>
                - levels
            </Text>
            <Box marginLeft={2} flexWrap="wrap">
                {FILTER_LEVELS.map((level, index) => (
                    <Chip
                        key={level}
                        label={level}
                        on={allLevels || enabledLevels.has(level)}
                        color={LEVEL_COLOR[level]}
                        focused={levelFocus === index}
                    />
                ))}
            </Box>
        </Box>
    );
}
