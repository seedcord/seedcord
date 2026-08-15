import { LEVEL_COLOR } from '@seedcord/logger';
import { Box, Text } from 'ink';
import React from 'react';

import { channelColor } from '#ui/channelColor';
import { focusedIn } from '#ui/filterCursor';
import { ui } from '#ui/palette';

import type { FilterCursor } from '#ui/filterCursor';
import type { LogLevel } from '@seedcord/logger';
import type { ReactElement } from 'react';

export const FILTER_LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace'];

interface FilterChipsProps {
    readonly channels: readonly string[];
    readonly enabledChannels: ReadonlySet<string>;
    readonly enabledLevels: ReadonlySet<LogLevel>;
    readonly cursor: FilterCursor | null;
    readonly open: boolean;
}

function Heading({ label, open }: { label: string; open: boolean }): ReactElement {
    return (
        <Text>
            <Text color={ui.accent} bold>
                {open ? '▾' : '▸'}
            </Text>
            <Text color={ui.muted}> {label}</Text>
        </Text>
    );
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

export function FilterChips({
    channels,
    enabledChannels,
    enabledLevels,
    cursor,
    open
}: FilterChipsProps): ReactElement {
    const allChannels = enabledChannels.size === 0;
    const allLevels = enabledLevels.size === 0;
    const channelFocus = focusedIn(cursor, 'channels', channels.length);
    const levelFocus = focusedIn(cursor, 'levels', FILTER_LEVELS.length);

    return (
        <Box flexDirection="column">
            {open ? null : (
                <Text dimColor wrap="truncate">
                    resize to see filters
                </Text>
            )}
            <Heading label="channels" open={open} />
            {open ? (
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
            ) : null}

            <Heading label="levels" open={open} />
            {open ? (
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
            ) : null}
        </Box>
    );
}
