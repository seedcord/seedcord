import { afterEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_CURSOR } from '@ui/filterCursor';
import { dispatchHotkey } from '@ui/hotkeys';
import { LogStore } from '@ui/stores/LogStore';

import type { LogLevel, LogRecord } from '@seedcord/logger';
import type { Key } from 'ink';

type Ctx = Parameters<typeof dispatchHotkey>[0];

// fixture: a full ink Key with every flag off, overridden per test
function key(overrides: Partial<Key> = {}): Key {
    return {
        upArrow: false,
        downArrow: false,
        leftArrow: false,
        rightArrow: false,
        pageDown: false,
        pageUp: false,
        return: false,
        escape: false,
        ctrl: false,
        shift: false,
        tab: false,
        backspace: false,
        delete: false,
        meta: false,
        ...overrides
    } as unknown as Key;
}

// fixture: only the fields the filter path reads, the rest stubbed
function makeCtx(overrides: Partial<Ctx>): Ctx {
    return {
        input: '',
        key: key(),
        state: {},
        interactive: true,
        scroll: {},
        store: {},
        enabled: new Set<string>(),
        setEnabled: vi.fn(),
        enabledLevels: new Set<LogLevel>(),
        setEnabledLevels: vi.fn(),
        cursor: INITIAL_CURSOR,
        setCursor: vi.fn(),
        filtersOpen: true,
        ...overrides
    } as unknown as Ctx;
}

async function seedChannel(channel: string): Promise<void> {
    const record: LogRecord = { level: 'info', message: 'x', label: 'Test', channel, timestamp: Date.now() };
    LogStore.instance.onLog(record);
    await LogStore.instance.flush();
}

describe('dispatchHotkey channel filters', () => {
    afterEach(() => {
        LogStore.instance.clear();
    });

    it('solos the focused channel on space', async () => {
        await seedChannel('alpha');
        await seedChannel('beta');
        const setEnabled = vi.fn();

        dispatchHotkey(makeCtx({ input: ' ', cursor: INITIAL_CURSOR, setEnabled }));

        expect(setEnabled).toHaveBeenCalledWith(new Set(['alpha']));
    });

    // the chips render only in the full tier, and a filter applied without them is invisible
    it('ignores the filter keys while the chips are closed', async () => {
        await seedChannel('alpha');
        const setEnabled = vi.fn();
        const setCursor = vi.fn();

        for (const input of [' ', 'o']) {
            dispatchHotkey(makeCtx({ input, filtersOpen: false, setEnabled, setCursor }));
        }

        expect(setEnabled).not.toHaveBeenCalled();
        expect(setCursor).not.toHaveBeenCalled();
    });

    it('restores all on space when the focused channel is already solo', async () => {
        await seedChannel('alpha');
        const setEnabled = vi.fn();

        dispatchHotkey(makeCtx({ input: ' ', cursor: INITIAL_CURSOR, enabled: new Set(['alpha']), setEnabled }));

        expect(setEnabled).toHaveBeenCalledWith(new Set());
    });

    it('toggles the focused channel off on o, keeping the rest', async () => {
        await seedChannel('alpha');
        await seedChannel('beta');
        const setEnabled = vi.fn();

        dispatchHotkey(makeCtx({ input: 'o', cursor: INITIAL_CURSOR, setEnabled }));

        expect(setEnabled).toHaveBeenCalledWith(new Set(['beta']));
    });

    it('does nothing on space or o when no channels exist', () => {
        const setEnabled = vi.fn();

        dispatchHotkey(makeCtx({ input: ' ', cursor: INITIAL_CURSOR, setEnabled }));
        dispatchHotkey(makeCtx({ input: 'o', cursor: INITIAL_CURSOR, setEnabled }));

        expect(setEnabled).not.toHaveBeenCalled();
    });
});

type ScrollSpy = Record<'up' | 'down' | 'pageUp' | 'pageDown' | 'toTop' | 'toBottom', ReturnType<typeof vi.fn>>;

// justified: dispatch reads only these six methods off scroll
function scrollSpy(): ScrollSpy & Ctx['scroll'] {
    const spies: ScrollSpy = {
        up: vi.fn(),
        down: vi.fn(),
        pageUp: vi.fn(),
        pageDown: vi.fn(),
        toTop: vi.fn(),
        toBottom: vi.fn()
    };
    return spies as ScrollSpy & Ctx['scroll'];
}

describe('scrolling alongside the filters', () => {
    afterEach(() => {
        LogStore.instance.clear();
    });

    it('scrolls on the keys the filters leave free', () => {
        const scroll = scrollSpy();

        dispatchHotkey(makeCtx({ key: key({ pageUp: true }), scroll }));
        dispatchHotkey(makeCtx({ key: key({ pageDown: true }), scroll }));
        dispatchHotkey(makeCtx({ key: key({ home: true }), scroll }));
        dispatchHotkey(makeCtx({ key: key({ end: true }), scroll }));
        dispatchHotkey(makeCtx({ input: 'b', scroll }));

        expect(scroll.pageUp).toHaveBeenCalledOnce();
        expect(scroll.pageDown).toHaveBeenCalledOnce();
        expect(scroll.toTop).toHaveBeenCalledOnce();
        expect(scroll.toBottom).toHaveBeenCalledTimes(2);
    });

    it('keeps t on top-of-log and o on the cursor', async () => {
        await seedChannel('alpha');
        const scroll = scrollSpy();
        const setEnabled = vi.fn();

        dispatchHotkey(makeCtx({ input: 't', scroll, setEnabled }));
        dispatchHotkey(makeCtx({ input: 'o', scroll, setEnabled }));

        expect(scroll.toTop).toHaveBeenCalledOnce();
        expect(setEnabled).toHaveBeenCalledOnce();
    });

    it('keeps the session actions reachable', () => {
        // justified: the action path reads only these two off the store
        const store = { beginRestart: vi.fn(), beginQuit: vi.fn() } as unknown as Ctx['store'];
        const onRestart = vi.fn();
        const onQuit = vi.fn();

        dispatchHotkey(makeCtx({ input: 'r', store, onRestart, scroll: scrollSpy() }));
        dispatchHotkey(makeCtx({ input: 'q', store, onQuit, scroll: scrollSpy() }));

        expect(onRestart).toHaveBeenCalledOnce();
        expect(onQuit).toHaveBeenCalledOnce();
    });
});

describe('filter cursor keys', () => {
    afterEach(() => {
        LogStore.instance.clear();
    });

    it('scrolls the log pane on up and down, which is what a wheel sends', () => {
        const scroll = scrollSpy();
        const setCursor = vi.fn();

        dispatchHotkey(makeCtx({ key: key({ upArrow: true }), scroll, setCursor }));
        dispatchHotkey(makeCtx({ key: key({ downArrow: true }), scroll, setCursor }));

        expect(scroll.up).toHaveBeenCalledOnce();
        expect(scroll.down).toHaveBeenCalledOnce();
        expect(setCursor).not.toHaveBeenCalled();
    });

    it('switches group on tab', () => {
        const setCursor = vi.fn();

        dispatchHotkey(makeCtx({ key: key({ tab: true }), setCursor, scroll: scrollSpy() }));

        expect(setCursor).toHaveBeenCalledWith({ group: 'levels', channels: 0, levels: 0 });
    });

    it('keeps left and right moving within the group', async () => {
        await seedChannel('alpha');
        await seedChannel('beta');
        const setCursor = vi.fn();

        dispatchHotkey(makeCtx({ key: key({ rightArrow: true }), setCursor, scroll: scrollSpy() }));

        expect(setCursor).toHaveBeenCalledWith({ group: 'channels', channels: 1, levels: 0 });
    });
});
