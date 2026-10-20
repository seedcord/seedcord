import { LEVEL_COLOR } from '@seedcord/logger';
import { Box, Text } from 'ink';
import React from 'react';

import { channelColor } from '#ui/channelColor';
import { Rule } from '#ui/components/primitives/Rule';
import { BAR, cellText, GUIDE, isErrorTail } from '#ui/LogLayout';
import { ui } from '#ui/palette';

import type { LogLayout, PrefixCell } from '#ui/LogLayout';
import type { EntryRow, LogRow } from '#ui/logRows';
import type { LogEntry } from '#ui/stores/LogStore';
import type { LogLevel } from '@seedcord/types';
import type { TextProps } from 'ink';
import type { ReactElement } from 'react';

const MIN_LOG_LINES = 5; // fits an error head plus a few stack frames

export const NO_ROOM = 'Need more room for logs.';
const CHIP_TEXT = '#1a1a1a';

const WASH: Partial<Record<LogLevel, TextProps>> = {
    warn: { backgroundColor: '#3a2f14' },
    error: { backgroundColor: '#3d1a20' }
};

const CELL_STYLE: Record<PrefixCell['kind'], (log: LogEntry) => TextProps> = {
    chip: (log) => ({ backgroundColor: LEVEL_COLOR[log.level], color: CHIP_TEXT, bold: true }),
    clock: () => ({ dimColor: true }),
    label: () => ({}),
    dot: (log) => ({ color: channelColor(log.channel) })
};

interface LineProps {
    readonly row: EntryRow;
    readonly layout: LogLayout;
}

function Prefix({ row, layout }: LineProps): ReactElement {
    return (
        <Text {...WASH[row.entry.level]}>
            {layout.cells.map((cell, index) => (
                <React.Fragment key={cell.kind}>
                    {index === 0 ? null : ' '}
                    <Text {...CELL_STYLE[cell.kind](row.entry)}>{cellText(cell, row.entry)}</Text>
                </React.Fragment>
            ))}
        </Text>
    );
}

function HeadLine({ row, layout }: LineProps): ReactElement {
    return (
        <Text wrap="truncate">
            <Prefix row={row} layout={layout} /> {row.text}
        </Text>
    );
}

function GuideLine({ row, layout }: LineProps): ReactElement {
    return (
        <Text wrap="truncate">
            {' '.repeat(layout.guideIndent)}
            <Text dimColor>{GUIDE}</Text>
            {row.text}
        </Text>
    );
}

function FrameLine({ row }: LineProps): ReactElement {
    return (
        <Text wrap="truncate">
            <Text color={LEVEL_COLOR.error} bold>
                {BAR}
            </Text>
            <Text dimColor={row.entry.frame}>{row.text}</Text>
        </Text>
    );
}

function Line(props: LineProps): ReactElement {
    if (isErrorTail(props.row.entry)) return <FrameLine {...props} />;
    if (props.row.entry.head && props.row.first) return <HeadLine {...props} />;
    return <GuideLine {...props} />;
}

export interface ScrollableLogViewProps {
    readonly visible: readonly LogRow[];
    readonly layout: LogLayout;
    readonly viewportHeight: number;
    // an unmeasured height would flash "too small" on the first frame
    readonly measured: boolean;
}

export function ScrollableLogView({
    visible,
    layout,
    viewportHeight,
    measured
}: ScrollableLogViewProps): ReactElement | null {
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

    return (
        // flex-end keeps the newest line on the bottom edge even when the buffer is nearly empty
        <Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflow="hidden">
            {visible.length === 0 ? (
                <Text dimColor>Waiting for logs…</Text>
            ) : (
                visible.map((row) =>
                    row.kind === 'rule' ? <Rule key={row.key} /> : <Line key={row.key} row={row} layout={layout} />
                )
            )}
        </Box>
    );
}
