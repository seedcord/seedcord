import { settled, stableFrame } from '@seedcord/cli-prompts/testing';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { NO_FILTER_ROOM } from '#ui/components/primitives/FilterPanel';
import { NO_ROOM } from '#ui/components/primitives/ScrollableLogView';
import { DevApp } from '#ui/DevApp';
import { devPrefsFile } from '#ui/devPrefs';
import { formatClock } from '#ui/format';
import { COMPACT_ROWS } from '#ui/Screen';
import { DevStore } from '#ui/stores/DevStore';
import { LogStore } from '#ui/stores/LogStore';

import { renderAt } from './renderAt';
import { renderOnScreen } from './renderOnScreen';

import type { DevPrefs } from '#ui/devPrefs';
import type { LogRecord } from '@seedcord/types';
import type { ComponentProps, ReactElement } from 'react';

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

const NO_PREFS: DevPrefs = devPrefsFile.defaults;

function view(
    size: { rows: number; columns: number },
    props: Partial<ComponentProps<typeof DevApp>> = {}
): ReturnType<typeof renderAt> {
    return renderAt(
        <DevApp store={runningStore()} onReady={() => undefined} initialPrefs={NO_PREFS} {...props} />,
        size
    );
}

// every channel the framework logs on
const MANY_CHANNELS = [
    'default',
    'bot',
    'lifecycle',
    'health',
    'interactions',
    'events',
    'commands',
    'subscribers',
    'errors',
    'gates',
    'plugins',
    'hmr',
    'cli',
    'tsc'
];

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
        await settled(() => expect(lastFrame()).toContain('f filters'));

        const frame = lastFrame();
        expect(frame).toContain('seedcord');
        expect(frame).toContain('running');
        expect(frame).not.toContain('channels');
        expect(frame).not.toContain('quit');

        unmount();
    });

    it('puts the status in a band above the logs and the cards below them on a narrow, tall terminal', async () => {
        const store = runningStore();
        store.setError(new Error('boom'));
        const app = view({ rows: 40, columns: 70 }, { store });
        await settled(() => expect(app.lastFrame()).toContain('logs/'));

        app.press('s');
        const frame = await stableFrame(app.lastFrame);
        expect(frame).toContain('Connected as TestBot');
        expect(frame).toContain('Error: Error');
        expect(frame).not.toContain('q quit');
        expect(frame).not.toContain('show rail');
        app.unmount();
    });

    it('slims the rail below the full width, and s hides it and brings it back', async () => {
        const app = view({ rows: 40, columns: 100 });
        await settled(() => expect(app.lastFrame()).toContain('hide rail'));
        expect(app.lastFrame()).not.toContain('channels');

        app.press('s');
        await settled(() => expect(app.lastFrame()).toContain('show rail'));
        expect(app.lastFrame()).not.toContain('q quit');

        app.press('s');
        await settled(() => expect(app.lastFrame()).toContain('hide rail'));
        app.unmount();
    });

    it('steps the details from auto to full to none and back on p', async () => {
        const seconds = formatClock(logOn('bot').timestamp, 'seconds');
        const minutes = formatClock(logOn('bot').timestamp, 'minutes');
        const app = view({ rows: 40, columns: 70 });
        LogStore.instance.onLog(logOn('bot'));
        await LogStore.instance.flush();
        await settled(() => expect(app.lastFrame()).toContain('from bot'));
        expect(app.lastFrame()).toContain(minutes);
        expect(app.lastFrame()).not.toContain(seconds);

        app.press('p');
        await settled(() => expect(app.lastFrame()).toContain(seconds));

        app.press('p');
        await settled(() => expect(app.lastFrame()).not.toContain(minutes));

        app.press('p');
        await settled(() => expect(app.lastFrame()).toContain(minutes));
        expect(app.lastFrame()).not.toContain(seconds);
        app.unmount();
    });

    it('names the pending notice on the status line', async () => {
        const store = runningStore();
        store.apply({ type: 'command-update-prompt', files: ['a.ts', 'b.ts'] });
        const { lastFrame, unmount } = view(LOGS, { store });

        await settled(() => expect(lastFrame()).toContain('2 commands updated'));
        unmount();
    });

    it('follows the terminal back up through the tiers', async () => {
        const { lastFrame, resize, unmount } = view(LOGS);
        await settled(() => expect(lastFrame()).toContain('f filters'));

        resize(FULL);
        await settled(() => expect(lastFrame()).toContain('▾ channels'));

        expect(lastFrame()).not.toContain('f filters');
        unmount();
    });

    // nothing animates while offline
    it('redraws the whole screen when the terminal gets wider', async () => {
        const offlineStore = (): DevStore => {
            const store = runningStore();
            store.setPhase('disconnected');
            return store;
        };
        const app = (): ReactElement => (
            <DevApp store={offlineStore()} onReady={() => undefined} initialPrefs={NO_PREFS} />
        );
        const widened = renderOnScreen(app(), { rows: 40, columns: 90 });
        await stableFrame(widened.screen);
        widened.resize(FULL);

        const fresh = renderOnScreen(app(), FULL);
        const expected = await stableFrame(fresh.screen);
        expect(expected).toContain('○ offline');
        expect(await stableFrame(widened.screen)).toBe(expected);

        widened.unmount();
        fresh.unmount();
    });

    it('ignores the filter keys while the chips are collapsed', async () => {
        const app = view(COMPACT);
        await settled(() => expect(app.lastFrame()).toContain('▸ channels'));

        for (const record of ['bot', 'hmr'].map(logOn)) LogStore.instance.onLog(record);
        await LogStore.instance.flush();
        await settled(() => expect(app.lastFrame()).toContain('from hmr'));

        app.press(' ');
        expect(await stableFrame(app.lastFrame)).toContain('from hmr');

        app.unmount();
    });

    it('opens with a rule across the whole terminal, so nothing sits on the top edge', async () => {
        const app = view(FULL);
        const frame = await stableFrame(app.lastFrame);

        expect(frame.split('\n')[0]).toBe('─'.repeat(FULL.columns));

        app.unmount();
    });

    // the stack can take every row the log column has, so the pane keeps one back for its own message
    it('always says something in the log pane', async () => {
        const store = squeezedStore();

        for (let rows = 20; rows <= 34; rows++) {
            const squeezed = view({ rows, columns: 120 }, { store });
            const frame = await stableFrame(squeezed.lastFrame);
            squeezed.unmount();

            const spoke = frame.includes(NO_ROOM) || frame.includes('Waiting for logs');
            expect(`${rows}:${String(spoke)}`).toBe(`${rows}:true`);
        }
    });
}, 30_000);

describe('DevApp filters below the full layout', () => {
    it('opens the filters in compact on f and closes them on f again', async () => {
        const app = view(COMPACT);
        await settled(() => expect(app.lastFrame()).toContain('▸ channels'));

        app.press('f');
        await settled(() => expect(app.lastFrame()).toContain('▾ channels'));
        expect(app.lastFrame()).toContain('back');

        app.press('f');
        await settled(() => expect(app.lastFrame()).toContain('▸ channels'));
        app.unmount();
    });

    it('swaps the log pane for the filters in the logs layout on f', async () => {
        const app = view(LOGS);
        LogStore.instance.onLog(logOn('hmr'));
        await LogStore.instance.flush();
        await settled(() => expect(app.lastFrame()).toContain('from hmr'));

        app.press('f');
        await settled(() => expect(app.lastFrame()).toContain('▾ channels'));
        expect(app.lastFrame()).not.toContain('from hmr');

        app.press('f');
        await settled(() => expect(app.lastFrame()).toContain('from hmr'));
        app.unmount();
    });

    it('closes the filters on a trip through full', async () => {
        const app = view(COMPACT);
        await settled(() => expect(app.lastFrame()).toContain('▸ channels'));
        app.press('f');
        await settled(() => expect(app.lastFrame()).toContain('f back'));

        app.resize(FULL);
        await settled(() => expect(app.lastFrame()).toContain('q quit'));
        app.resize(COMPACT);

        await settled(() => expect(app.lastFrame()).toContain('▸ channels'));
        app.unmount();
    });

    it('asks for more room and holds the filter keys when the chips do not fit', async () => {
        const onPrefsChange = vi.fn();
        const app = view({ rows: 9, columns: 79 }, { onPrefsChange });
        for (const record of MANY_CHANNELS.map(logOn)) LogStore.instance.onLog(record);
        await LogStore.instance.flush();

        app.press('f');
        await settled(() => expect(app.lastFrame()).toContain(NO_FILTER_ROOM));
        app.press(' ');

        expect(await stableFrame(app.lastFrame)).toContain(NO_FILTER_ROOM);
        expect(onPrefsChange).not.toHaveBeenCalled();
        app.unmount();
    });

    it('shows every chip once the panel has room', async () => {
        const app = view({ rows: 12, columns: 79 });
        for (const record of MANY_CHANNELS.map(logOn)) LogStore.instance.onLog(record);
        await LogStore.instance.flush();

        app.press('f');
        await settled(() => expect(app.lastFrame()).toContain('o toggle'));

        expect(app.lastFrame()).not.toContain(NO_FILTER_ROOM);
        app.unmount();
    });

    it('ignores f in full, where the chips always show', async () => {
        const app = view(FULL);
        await settled(() => expect(app.lastFrame()).toContain('▾ channels'));

        app.press('f');
        app.resize(COMPACT);

        await settled(() => expect(app.lastFrame()).toContain('▸ channels'));
        app.unmount();
    });

    it('takes the filter keys once f opens the filters in compact', async () => {
        const onPrefsChange = vi.fn();
        const app = view(COMPACT, { onPrefsChange });
        for (const record of ['bot', 'hmr'].map(logOn)) LogStore.instance.onLog(record);
        await LogStore.instance.flush();
        await settled(() => expect(app.lastFrame()).toContain('from hmr'));
        const [focused] = LogStore.instance.getChannels();

        app.press('f');
        await settled(() => expect(app.lastFrame()).toContain('▾ channels'));
        app.press(' ');

        await settled(() =>
            expect(onPrefsChange).toHaveBeenCalledWith(
                expect.objectContaining({ filters: { channels: new Set([focused]), levels: new Set() } })
            )
        );
        app.unmount();
    });
});

describe('DevApp saved prefs', () => {
    it('opens with the saved filters applied and the rail hidden', async () => {
        const app = view(FULL, {
            initialPrefs: { ...NO_PREFS, filters: { channels: new Set(['hmr']), levels: new Set() }, railHidden: true }
        });

        for (const record of ['bot', 'hmr'].map(logOn)) LogStore.instance.onLog(record);
        await LogStore.instance.flush();
        await settled(() => expect(app.lastFrame()).toContain('from hmr'));

        expect(app.lastFrame()).not.toContain('from bot');
        expect(app.lastFrame()).toContain('show rail');
        app.unmount();
    });

    it('reports the prefs after a filter key, s, and p', async () => {
        const onPrefsChange = vi.fn();
        const app = view(FULL, { onPrefsChange });

        for (const record of ['bot', 'hmr'].map(logOn)) LogStore.instance.onLog(record);
        await LogStore.instance.flush();
        await settled(() => expect(app.lastFrame()).toContain('from hmr'));
        const [focused] = LogStore.instance.getChannels();

        app.press(' ');
        await settled(() => expect(onPrefsChange).toHaveBeenCalledOnce());
        app.press('s');
        await settled(() => expect(onPrefsChange).toHaveBeenCalledTimes(2));
        app.press('p');

        await settled(() =>
            expect(onPrefsChange).toHaveBeenLastCalledWith({
                filters: { channels: new Set([focused]), levels: new Set() },
                details: 'full',
                railHidden: true
            })
        );
        app.unmount();
    });
});
