import { stripVTControlCharacters } from 'node:util';

import { LEVEL_COLOR } from '@seedcord/logger';
import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { NO_ROOM, ScrollableLogView } from '#ui/components/primitives/ScrollableLogView';
import { formatClock } from '#ui/format';
import { LogLayout } from '#ui/LogLayout';
import { expandRows, wrapRows } from '#ui/logRows';

import { logEntry as entry } from './logEntry';

import type { LogEntry } from '#ui/stores/LogStore';
import type { LogLevel } from '@seedcord/types';

const WIDE = LogLayout.fit(120, 12, 'auto');
// safe because LEVEL_COLOR is a Record over every LogLevel
const LEVELS = Object.keys(LEVEL_COLOR) as LogLevel[];

function frameOf(logs: readonly LogEntry[], layout = WIDE): string {
    const rows = wrapRows(expandRows(logs), layout);
    const { lastFrame } = render(<ScrollableLogView visible={rows} layout={layout} viewportHeight={10} measured />);
    return stripVTControlCharacters(lastFrame() ?? '');
}

function linesOf(frame: string): string[] {
    return frame.split('\n').filter((line) => line.trim() !== '');
}

describe('ScrollableLogView', () => {
    it('renders a head line with the clock, label, dot, and message', () => {
        const frame = frameOf([entry({ label: 'Mongoose', text: 'connected' })]);

        expect(frame).toContain(formatClock(0, 'seconds'));
        expect(frame).toContain('Mongoose');
        expect(frame).toContain('●');
        expect(frame).toContain('connected');
    });

    it('leaves the clock off a narrow pane', () => {
        const frame = frameOf([entry({ text: 'connected' })], LogLayout.fit(50, 12, 'auto'));

        expect(frame).not.toContain(formatClock(0, 'minutes'));
        expect(frame).toContain('connected');
    });

    it.each(LEVELS)('starts a %s message at the layout column', (level) => {
        const [line = ''] = linesOf(frameOf([entry({ level, text: 'connected' })]));

        expect(line.indexOf('connected')).toBe(WIDE.messageColumn);
    });

    it('rails an error continuation line with the bar', () => {
        const frame = frameOf([
            entry({ id: 1, level: 'error', text: 'boom' }),
            entry({ id: 2, level: 'error', head: false, frame: true, text: '    at run (a.ts:1:1)' })
        ]);

        expect(frame).toContain('▌    at run (a.ts:1:1)');
    });

    it('guides a non-error continuation under the dot', () => {
        const lines = linesOf(
            frameOf([
                entry({ id: 1, label: 'Interactions', text: 'Loaded handlers' }),
                entry({ id: 2, label: 'Interactions', head: false, text: 'FeedNav' })
            ])
        );
        const head = lines.find((line) => line.includes('Loaded handlers')) ?? '';
        const guided = lines.find((line) => line.includes('FeedNav')) ?? '';

        expect(head.indexOf('●')).toBe(WIDE.guideIndent);
        expect(guided.indexOf('│')).toBe(WIDE.guideIndent);
    });

    it('brackets a non-error block with a rule above and below', () => {
        const lines = linesOf(
            frameOf([entry({ id: 1, text: 'Loaded handlers' }), entry({ id: 2, head: false, text: 'FeedNav' })])
        );

        expect(lines.filter((line) => line.includes('─'))).toHaveLength(2);
        expect(lines.some((line) => line.includes('Loaded handlers') && line.includes('─'))).toBe(false);
    });

    it('carries a long message onto a second line with no second prefix', () => {
        const layout = LogLayout.fit(LogLayout.fit(0, 3, 'auto').messageColumn + 20, 3, 'auto');
        const lines = linesOf(
            frameOf([entry({ text: 'alpha bravo charlie delta echo foxtrot golf hotel india' })], layout)
        );

        expect(lines).toHaveLength(3);
        expect(lines.filter((line) => line.includes('●'))).toHaveLength(1);
        expect(lines.at(-1)).toContain('india');
    });

    it('renders nothing until measured', () => {
        const { lastFrame } = render(
            <ScrollableLogView visible={[]} layout={WIDE} viewportHeight={10} measured={false} />
        );
        expect((lastFrame() ?? '').trim()).toBe('');
    });

    it('reports a viewport with too few rows to carry a log line', () => {
        const { lastFrame } = render(<ScrollableLogView visible={[]} layout={WIDE} viewportHeight={2} measured />);
        expect(lastFrame() ?? '').toContain(NO_ROOM);
    });
});
