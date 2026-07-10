import { LEVEL_COLOR } from '@seedcord/logger';
import { Box, Text } from 'ink';
import React from 'react';

import { channelColor } from '@ui/channelColor';
import { formatClock } from '@ui/format';
import { LogStore } from '@ui/stores/LogStore';

import type { LogLevel } from '@seedcord/logger';
import type { LogRow } from '@ui/logRows';
import type { LogEntry } from '@ui/stores/LogStore';
import type { ReactElement } from 'react';

const MIN_LOG_LINES = 3;
const DOT = '⏺';
const BAR = '▌';
const GUIDE = '│';
const ELLIPSIS = '…';
const CHIP_TEXT = '#1a1a1a';
const CHIP_WIDTH = 3;
const TIME_WIDTH = 8;
const DOT_WIDTH = 1;

// column where the head-line message starts: chip, time, label, dot, each followed by a space
const messageColumn = (labelWidth: number): number => CHIP_WIDTH + 1 + TIME_WIDTH + 1 + labelWidth + 1 + DOT_WIDTH + 1;

const LEVEL_LETTER: Record<LogLevel, string> = { error: 'E', warn: 'W', info: 'I', debug: 'D', trace: 'T' };

// warn and error tint their left prefix (through the channel dot), the message keeps its own color
const WASH: Partial<Record<LogLevel, string>> = { warn: '#3a2f14', error: '#3d1a20' };

function truncate(label: string, width: number): string {
    return label.length > width ? `${label.slice(0, width - 1)}${ELLIPSIS}` : label;
}

function Chip({ level }: { level: LogLevel }): ReactElement {
    return (
        <Text backgroundColor={LEVEL_COLOR[level]} color={CHIP_TEXT} bold>
            {` ${LEVEL_LETTER[level]} `}
        </Text>
    );
}

function Prefix({ log, labelWidth }: { log: LogEntry; labelWidth: number }): ReactElement {
    const label = truncate(log.label, labelWidth).padStart(labelWidth);
    return (
        <>
            <Chip level={log.level} /> <Text dimColor>{formatClock(log.timestamp)}</Text> <Text>{label}</Text>{' '}
            <Text color={channelColor(log.channel)}>{DOT}</Text>
        </>
    );
}

function HeadLine({ log, labelWidth }: { log: LogEntry; labelWidth: number }): ReactElement {
    const wash = WASH[log.level];

    if (wash) {
        return (
            <Text wrap="truncate">
                <Text backgroundColor={wash}>
                    <Prefix log={log} labelWidth={labelWidth} />
                </Text>{' '}
                {log.text}
            </Text>
        );
    }

    return (
        <Text wrap="truncate">
            <Prefix log={log} labelWidth={labelWidth} /> {log.text}
        </Text>
    );
}

function ContinuationLine({ log, labelWidth }: { log: LogEntry; labelWidth: number }): ReactElement {
    if (log.level === 'error') {
        return (
            <Text wrap="truncate">
                <Text color={LEVEL_COLOR.error} bold>
                    {BAR}
                </Text>
                <Text dimColor>{log.text}</Text>
            </Text>
        );
    }

    // block line: a faint guide under the message column, the content keeps its own color
    return (
        <Text wrap="truncate">
            {' '.repeat(messageColumn(labelWidth) - 2)}
            <Text dimColor>{GUIDE}</Text> {log.text}
        </Text>
    );
}

// full-width flex line bracketing a block
function Rule(): ReactElement {
    return (
        <Box
            borderStyle="single"
            borderTop
            borderBottom={false}
            borderLeft={false}
            borderRight={false}
            borderDimColor
        />
    );
}

interface ScrollableLogViewProps {
    readonly visible: readonly LogRow[];
    readonly viewportHeight: number;
    // false until the parent box is measured, which avoids a one-frame "too small" flash on mount
    readonly measured: boolean;
}

export function ScrollableLogView({ visible, viewportHeight, measured }: ScrollableLogViewProps): ReactElement | null {
    if (!measured) return null;

    if (viewportHeight < MIN_LOG_LINES) {
        return (
            <Text color="yellow" wrap="truncate">
                Terminal too small to show logs.
            </Text>
        );
    }

    const labelWidth = Math.max(1, LogStore.instance.getLabelWidth());

    return (
        // flex-end pins the newest line to the bottom edge (tail -f), and a sparse buffer stays pinned there too
        <Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflow="hidden">
            {visible.length === 0 ? (
                <Text dimColor>Waiting for logs…</Text>
            ) : (
                visible.map((row) =>
                    row.kind === 'rule' ? (
                        <Rule key={row.key} />
                    ) : row.entry.head ? (
                        <HeadLine key={row.key} log={row.entry} labelWidth={labelWidth} />
                    ) : (
                        <ContinuationLine key={row.key} log={row.entry} labelWidth={labelWidth} />
                    )
                )
            )}
        </Box>
    );
}
