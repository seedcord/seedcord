import { LEVEL_COLOR } from '@seedcord/logger';
import { Box, Text } from 'ink';
import React from 'react';

import { channelColor } from '#ui/channelColor';
import { focusedIn } from '#ui/filterCursor';
import { ui } from '#ui/palette';

import type { LogFilters } from '#ui/devPrefs';
import type { FilterCursor } from '#ui/filterCursor';
import type { LogLevel } from '@seedcord/types';
import type { ReactElement } from 'react';

export const FILTER_LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace'];

interface FilterChipsProps {
    readonly channels: readonly string[];
    readonly filters: LogFilters;
    readonly cursor: FilterCursor | null;
    readonly open: boolean;
}

const HEADING_WIDTH = 'channels'.length;

// a long list here would widen the rail for the whole run
function summarize(selected: ReadonlySet<string>): string {
    const [first, ...rest] = selected;
    if (first === undefined) return 'all';
    return rest.length === 0 ? first : `${first} +${rest.length}`;
}

interface HeadingProps {
    readonly label: string;
    readonly open: boolean;
    readonly selected: ReadonlySet<string>;
}

function Heading({ label, open, selected }: HeadingProps): ReactElement {
    return (
        <Text wrap="truncate">
            <Text color={ui.accent} bold>
                {open ? '▾' : '▸'}
            </Text>
            {open ? (
                <Text color={ui.muted}> {label}</Text>
            ) : (
                <Text>
                    <Text color={ui.muted}> {label.padEnd(HEADING_WIDTH)}</Text>
                    {`  ${summarize(selected)}`}
                </Text>
            )}
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

export function FilterChips({ channels, filters, cursor, open }: FilterChipsProps): ReactElement {
    const allChannels = filters.channels.size === 0;
    const allLevels = filters.levels.size === 0;
    const channelFocus = focusedIn(cursor, 'channels', channels.length);
    const levelFocus = focusedIn(cursor, 'levels', FILTER_LEVELS.length);

    return (
        <Box flexDirection="column">
            <Heading label="channels" open={open} selected={filters.channels} />
            {open ? (
                <Box marginLeft={2} flexWrap="wrap">
                    {channels.map((channel, index) => (
                        <Chip
                            key={channel}
                            label={channel}
                            on={allChannels || filters.channels.has(channel)}
                            color={channelColor(channel)}
                            focused={channelFocus === index}
                        />
                    ))}
                </Box>
            ) : null}

            <Heading label="levels" open={open} selected={filters.levels} />
            {open ? (
                <Box marginLeft={2} flexWrap="wrap">
                    {FILTER_LEVELS.map((level, index) => (
                        <Chip
                            key={level}
                            label={level}
                            on={allLevels || filters.levels.has(level)}
                            color={LEVEL_COLOR[level]}
                            focused={levelFocus === index}
                        />
                    ))}
                </Box>
            ) : null}
        </Box>
    );
}
