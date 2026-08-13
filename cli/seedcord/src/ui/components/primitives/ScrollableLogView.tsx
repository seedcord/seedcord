import { LEVEL_COLOR } from '@seedcord/logger';
import { Box, Text } from 'ink';
import React from 'react';

import { channelColor } from '@ui/channelColor';
import { Rule } from '@ui/components/primitives/Rule';
import { formatClock } from '@ui/format';
import { messageColumn } from '@ui/logRows';
import { ui } from '@ui/palette';
import { LogStore } from '@ui/stores/LogStore';

import type { LogLevel } from '@seedcord/logger';
import type { LogRow } from '@ui/logRows';
import type { LogEntry } from '@ui/stores/LogStore';
import type { ReactElement } from 'react';

const MIN_LOG_LINES = 5; // fits an error head plus a few stack frames

export const NO_ROOM = 'Need more room for logs.';
const DOT = '●';
const BAR = '▌';
const GUIDE = '│';
const ELLIPSIS = '…';
const CHIP_TEXT = '#1a1a1a';

const LEVEL_LETTER: Record<LogLevel, string> = { error: 'E', warn: 'W', info: 'I', debug: 'D', trace: 'T' };

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

interface LineProps {
    readonly log: LogEntry;
    readonly text: string;
    readonly labelWidth: number;
}

function HeadLine({ log, text, labelWidth }: LineProps): ReactElement {
    const wash = WASH[log.level];

    if (wash) {
        return (
            <Text wrap="truncate">
                <Text backgroundColor={wash}>
                    <Prefix log={log} labelWidth={labelWidth} />
                </Text>{' '}
                {text}
            </Text>
        );
    }

    return (
        <Text wrap="truncate">
            <Prefix log={log} labelWidth={labelWidth} /> {text}
        </Text>
    );
}

function HeadTail({ text, labelWidth }: Omit<LineProps, 'log'>): ReactElement {
    return (
        <Text wrap="truncate">
            {' '.repeat(messageColumn(labelWidth) - 2)}
            <Text dimColor>{GUIDE}</Text> {text}
        </Text>
    );
}

function ContinuationLine({ log, text, labelWidth }: LineProps): ReactElement {
    if (log.level === 'error') {
        return (
            <Text wrap="truncate">
                <Text color={LEVEL_COLOR.error} bold>
                    {BAR}
                </Text>
                <Text dimColor={log.frame}>{text}</Text>
            </Text>
        );
    }

    return (
        <Text wrap="truncate">
            {' '.repeat(messageColumn(labelWidth) - 2)}
            <Text dimColor>{GUIDE}</Text> {text}
        </Text>
    );
}

interface ScrollableLogViewProps {
    readonly visible: readonly LogRow[];
    readonly viewportHeight: number;
    // an unmeasured height would flash "too small" on the first frame
    readonly measured: boolean;
}

export function ScrollableLogView({ visible, viewportHeight, measured }: ScrollableLogViewProps): ReactElement | null {
    if (!measured) return null;

    if (viewportHeight < MIN_LOG_LINES) {
        return (
            <Box flexGrow={1} alignItems="center" justifyContent="center" overflow="hidden">
                <Text color={ui.warn} bold wrap="truncate">
                    {NO_ROOM}
                </Text>
            </Box>
        );
    }

    const labelWidth = Math.max(1, LogStore.instance.getLabelWidth());

    return (
        // flex-end keeps the newest line on the bottom edge even when the buffer is nearly empty
        <Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflow="hidden">
            {visible.length === 0 ? (
                <Text dimColor>Waiting for logs…</Text>
            ) : (
                visible.map((row) => {
                    if (row.kind === 'rule') return <Rule key={row.key} />;
                    const props = { log: row.entry, text: row.text, labelWidth };
                    // a continuation draws its gutter on every row
                    if (!row.entry.head) return <ContinuationLine key={row.key} {...props} />;
                    return row.first ? <HeadLine key={row.key} {...props} /> : <HeadTail key={row.key} {...props} />;
                })
            )}
        </Box>
    );
}
