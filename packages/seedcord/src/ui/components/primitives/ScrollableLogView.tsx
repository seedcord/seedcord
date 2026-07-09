import { Box, Text } from 'ink';
import React from 'react';

import { channelColor } from '@ui/channelColor';
import { formatClock } from '@ui/format';
import { LogStore } from '@ui/stores/LogStore';

import type { LogLevel } from '@seedcord/logger';
import type { LogEntry } from '@ui/stores/LogStore';
import type { ReactElement } from 'react';

const MIN_LOG_LINES = 3;
const DOT = '⏺';
const BAR = '▌';
const ELLIPSIS = '…';
const CHIP_TEXT = '#1a1a1a';

const LEVEL_COLOR: Record<LogLevel, string> = {
    error: '#ff6b85',
    warn: '#ffc061',
    info: '#66d98a',
    debug: '#66b3ff',
    trace: '#b399e6'
};

const LEVEL_LETTER: Record<LogLevel, string> = { error: 'E', warn: 'W', info: 'I', debug: 'D', trace: 'T' };

// warn and error tint their left chrome (through the channel dot), the message keeps its own color
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

function Chrome({ log, labelWidth }: { log: LogEntry; labelWidth: number }): ReactElement {
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
                    <Chrome log={log} labelWidth={labelWidth} />
                </Text>{' '}
                {log.text}
            </Text>
        );
    }

    return (
        <Text wrap="truncate">
            <Chrome log={log} labelWidth={labelWidth} /> {log.text}
        </Text>
    );
}

function ContinuationLine({ log }: { log: LogEntry }): ReactElement {
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

    return (
        <Text wrap="truncate" dimColor>
            {log.text}
        </Text>
    );
}

interface ScrollableLogViewProps {
    readonly visible: readonly LogEntry[];
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
        // flex-end pins the newest line to the bottom edge (tail -f), a sparse buffer stays pinned there too
        <Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflow="hidden">
            {visible.length === 0 ? (
                <Text dimColor>Waiting for logs…</Text>
            ) : (
                visible.map((log) =>
                    log.head ? (
                        <HeadLine key={log.id} log={log} labelWidth={labelWidth} />
                    ) : (
                        <ContinuationLine key={log.id} log={log} />
                    )
                )
            )}
        </Box>
    );
}
