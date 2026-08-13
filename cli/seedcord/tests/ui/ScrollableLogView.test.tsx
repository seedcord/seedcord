import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { NO_ROOM, ScrollableLogView } from '@ui/components/primitives/ScrollableLogView';
import { expandRows, messageColumn, wrapRows } from '@ui/logRows';
import { LogStore } from '@ui/stores/LogStore';

import type { LogRecord } from '@seedcord/logger';

function record(over: Partial<LogRecord>): LogRecord {
    return { level: 'info', message: '', label: 'Bot', channel: 'default', timestamp: 1_700_000_000_000, ...over };
}

describe('ScrollableLogView', () => {
    const store = LogStore.instance;
    afterEach(() => store.clear());

    it('renders a head line with the label, dot, and message', async () => {
        store.onLog(record({ label: 'Mongoose', message: 'connected' }));
        await store.flush();

        const { lastFrame } = render(
            <ScrollableLogView visible={expandRows(store.getLogs())} viewportHeight={10} measured />
        );
        const frame = lastFrame() ?? '';
        expect(frame).toContain('Mongoose');
        expect(frame).toContain('●');
        expect(frame).toContain('connected');
    });

    it('rails an error continuation line with the bar', async () => {
        store.onLog(record({ level: 'error', message: 'boom', args: [new Error('bad')] }));
        await store.flush();

        const { lastFrame } = render(
            <ScrollableLogView visible={expandRows(store.getLogs())} viewportHeight={10} measured />
        );
        expect(lastFrame() ?? '').toContain('▌');
    });

    it('renders a non-error continuation as a guided block line', async () => {
        store.onLog(record({ label: 'Interactions', message: 'Loaded handlers\nFeedNav' }));
        await store.flush();

        const frame =
            render(
                <ScrollableLogView visible={expandRows(store.getLogs())} viewportHeight={10} measured />
            ).lastFrame() ?? '';
        expect(frame).toContain('│');
        expect(frame).toContain('FeedNav');
    });

    it('brackets a non-error block with a full-width rule above and below', async () => {
        store.onLog(record({ label: 'Interactions', message: 'Loaded handlers\nFeedNav' }));
        await store.flush();

        const frame =
            render(
                <ScrollableLogView visible={expandRows(store.getLogs())} viewportHeight={10} measured />
            ).lastFrame() ?? '';
        const ruleLines = frame.split('\n').filter((line) => line.includes('─'));
        expect(ruleLines.length).toBeGreaterThanOrEqual(2);
        const merged = frame.split('\n').some((line) => line.includes('Loaded handlers') && line.includes('─'));
        expect(merged).toBe(false);
    });

    it('leaves a single-line log unruled', async () => {
        store.onLog(record({ message: 'connected' }));
        await store.flush();

        const frame =
            render(
                <ScrollableLogView visible={expandRows(store.getLogs())} viewportHeight={10} measured />
            ).lastFrame() ?? '';
        expect(frame).not.toContain('─');
    });

    it('leaves an error stack unruled', async () => {
        store.onLog(record({ level: 'error', message: 'boom', args: [new Error('bad')] }));
        await store.flush();

        const frame =
            render(
                <ScrollableLogView visible={expandRows(store.getLogs())} viewportHeight={10} measured />
            ).lastFrame() ?? '';
        expect(frame).not.toContain('─');
    });

    it('carries a long message onto a second line with no second prefix', async () => {
        store.onLog(record({ label: 'Bot', message: 'alpha bravo charlie delta echo foxtrot golf hotel india' }));
        await store.flush();

        const width = messageColumn(3) + 20;
        const rows = wrapRows(expandRows(store.getLogs()), width, 3);
        const frame = render(<ScrollableLogView visible={rows} viewportHeight={10} measured />).lastFrame() ?? '';
        const lines = frame.split('\n').filter((line) => line.trim() !== '');

        expect(lines).toHaveLength(3);
        expect(lines.filter((line) => line.includes('●'))).toHaveLength(1);
        expect(frame).toContain('india');
    });

    it('renders nothing until measured', () => {
        const { lastFrame } = render(<ScrollableLogView visible={[]} viewportHeight={10} measured={false} />);
        expect((lastFrame() ?? '').trim()).toBe('');
    });

    it('reports a viewport with too few rows to carry a log line', () => {
        const { lastFrame } = render(<ScrollableLogView visible={[]} viewportHeight={2} measured />);
        expect(lastFrame() ?? '').toContain(NO_ROOM);
    });
});
