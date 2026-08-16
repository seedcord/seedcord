import React from 'react';
import { describe, expect, it } from 'vitest';

import { NO_ROOM } from '#ui/components/primitives/ScrollableLogView';
import { DevApp } from '#ui/DevApp';
import { DevStore } from '#ui/stores/DevStore';
import { LogStore } from '#ui/stores/LogStore';
import { COMPACT_ROWS } from '#ui/tier';

import { renderAt } from './renderAt';
import { settled, stableFrame } from './settled';

import type { LogRecord } from '@seedcord/logger';

const FULL = { rows: 40, columns: 120 };
const COMPACT = { rows: COMPACT_ROWS, columns: 120 };
const LOGS = { rows: 12, columns: 120 };

function runningStore(): DevStore {
    const store = new DevStore();
    store.setPhase('running');
    store.setBusy(false);
    store.setStatus('Connected as TestBot');
    return store;
}

// three cards at once is what leaves the log pane with nothing
function squeezedStore(): DevStore {
    const store = runningStore();
    store.setError(new Error('boom'));
    store.apply({ type: 'restart-required' });
    store.apply({ type: 'command-update-prompt', files: ['a.ts', 'b.ts', 'c.ts', 'd.ts'] });
    return store;
}

function view(size: { rows: number; columns: number }, store = runningStore()): ReturnType<typeof renderAt> {
    return renderAt(<DevApp store={store} onReady={() => undefined} />, size);
}

function logOn(channel: string): LogRecord {
    return { level: 'info', message: `from ${channel}`, label: 'Bot', channel, timestamp: 1_700_000_000_000 };
}

describe('DevApp tiers', () => {
    it('renders the whole rail on a roomy terminal', async () => {
        const { lastFrame, unmount } = view(FULL);
        await settled(() => expect(lastFrame()).toContain('toggle'));

        const frame = lastFrame();
        expect(frame).toContain('seedcord');
        expect(frame).toContain('running');
        expect(frame).toContain('▾ channels');

        unmount();
    });

    it('collapses the filters and their keys when the rail stops fitting whole', async () => {
        const { lastFrame, unmount } = view(COMPACT);
        await settled(() => expect(lastFrame()).toContain('▸ channels'));

        const frame = lastFrame();
        expect(frame).toContain('quit');
        expect(frame).not.toContain('toggle');

        unmount();
    });

    it('replaces the rail with the status line once the collapsed form stops fitting', async () => {
        const { lastFrame, unmount } = view(LOGS);
        await settled(() => expect(lastFrame()).toContain('resize'));

        const frame = lastFrame();
        expect(frame).toContain('seedcord');
        expect(frame).toContain('running');
        expect(frame).not.toContain('channels');
        expect(frame).not.toContain('quit');

        unmount();
    });

    it('names the pending notice on the status line', async () => {
        const store = runningStore();
        store.apply({ type: 'command-update-prompt', files: ['a.ts', 'b.ts'] });
        const { lastFrame, unmount } = view(LOGS, store);

        await settled(() => expect(lastFrame()).toContain('2 commands updated'));
        unmount();
    });

    it('follows the terminal back up through the tiers', async () => {
        const { lastFrame, resize, unmount } = view(LOGS);
        await settled(() => expect(lastFrame()).toContain('resize'));

        resize(FULL);
        await settled(() => expect(lastFrame()).toContain('▾ channels'));

        expect(lastFrame()).not.toContain('resize');
        unmount();
    });

    // the chips are hidden below full, so a keypress that filters them changes what the pane shows with
    // nothing on screen to explain it
    it('ignores the filter keys once the chips are hidden', async () => {
        const view = renderAt(<DevApp store={runningStore()} onReady={() => undefined} />, COMPACT);
        await settled(() => expect(view.lastFrame()).toContain('▸ channels'));

        for (const record of ['bot', 'hmr'].map(logOn)) LogStore.instance.onLog(record);
        await LogStore.instance.flush();
        await settled(() => expect(view.lastFrame()).toContain('from hmr'));

        view.press(' ');
        expect(await stableFrame(view.lastFrame)).toContain('from hmr');

        view.unmount();
    });

    it('opens with a rule across the whole terminal, so nothing sits on the top edge', async () => {
        const app = renderAt(<DevApp store={runningStore()} onReady={() => undefined} />, FULL);
        const frame = await stableFrame(app.lastFrame);

        expect(frame.split('\n')[0]).toBe('─'.repeat(FULL.columns));

        app.unmount();
    });

    // the stack can take every row the log column has, so the pane keeps one back for its own message
    it('always says something in the log pane', async () => {
        const store = squeezedStore();

        for (let rows = 20; rows <= 34; rows++) {
            const squeezed = view({ rows, columns: 120 }, store);
            const frame = await stableFrame(squeezed.lastFrame);
            squeezed.unmount();

            const spoke = frame.includes(NO_ROOM) || frame.includes('Waiting for logs');
            expect(`${rows}:${String(spoke)}`).toBe(`${rows}:true`);
        }
    });
}, 30_000);
