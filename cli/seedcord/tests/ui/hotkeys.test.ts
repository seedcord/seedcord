import { afterEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_CURSOR } from '#ui/filterCursor';
import { acceptsSessionKeys, dispatchHotkey } from '#ui/hotkeys';
import { DevStore } from '#ui/stores/DevStore';
import { LogStore } from '#ui/stores/LogStore';

import type { LogFilters } from '#ui/devPrefs';
import type { LogLevel, LogRecord } from '@seedcord/types';
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

function filtersOf(channels: string[] = [], levels: LogLevel[] = []): LogFilters {
    return { channels: new Set(channels), levels: new Set(levels) };
}

// fixture: only the fields the filter path reads, the rest stubbed
function makeCtx(overrides: Partial<Ctx>): Ctx {
    return {
        input: '',
        key: key(),
        state: { armed: null, commandUpdatePrompt: null, phase: 'running' },
        interactive: true,
        scroll: {},
        store: {},
        filters: filtersOf(),
        setFilters: vi.fn(),
        filterView: 'always',
        toggleFilterView: vi.fn(),
        cursor: INITIAL_CURSOR,
        setCursor: vi.fn(),
        ...overrides
    } as unknown as Ctx;
}

async function seedChannel(channel: string): Promise<void> {
    const record: LogRecord = { level: 'info', message: 'x', label: 'Test', channel, timestamp: Date.now() };
    LogStore.instance.onLog(record);
    await LogStore.instance.flush();
}

describe('session keys while the bot starts', () => {
    const starting = { phase: 'starting', isBusy: true, restartRequired: false } as const;

    it.each([
        ['while the bot starts', starting, true],
        ['while the bot runs', { phase: 'running', isBusy: false, restartRequired: false }, true],
        ['while a restart is required', { phase: 'restart-required', isBusy: true, restartRequired: true }, true],
        ['while dev quits', { phase: 'quitting', isBusy: true, restartRequired: false }, false]
    ] as const)('takes r, d and c %s', (_when, state, enabled) => {
        expect(acceptsSessionKeys(state)).toBe(enabled);
    });

    it('disconnects on d while the bot starts', () => {
        const onDisconnect = vi.fn();
        const store = new DevStore();

        dispatchHotkey(makeCtx({ input: 'd', state: store.getState(), store, onDisconnect }));

        expect(onDisconnect).toHaveBeenCalledOnce();
    });

    it('holds r, d and c while a prompt waits for y or n, and leaves every other key working', () => {
        const store = new DevStore();
        store.setPhase('running');
        store.apply({ type: 'command-update-prompt', files: ['a.ts'] });
        const onRestart = vi.fn();
        const onDisconnect = vi.fn();
        const onQuit = vi.fn();
        const onRefreshCommands = vi.fn();
        const scroll = scrollSpy();
        const ctx = { state: store.getState(), store, scroll, onRestart, onDisconnect, onQuit, onRefreshCommands };

        for (const input of ['r', 'd', 'c']) dispatchHotkey(makeCtx({ ...ctx, input }));
        dispatchHotkey(makeCtx({ ...ctx, input: 'd', key: key({ ctrl: true }) }));
        expect(store.getState().armed).toBeNull();
        dispatchHotkey(makeCtx({ ...ctx, input: 't' }));
        dispatchHotkey(makeCtx({ ...ctx, input: 'y' }));
        dispatchHotkey(makeCtx({ ...ctx, input: 'q' }));

        expect(onRestart).not.toHaveBeenCalled();
        expect(onDisconnect).not.toHaveBeenCalled();
        expect(scroll.toBottom).not.toHaveBeenCalled();
        expect(scroll.toTop).toHaveBeenCalledOnce();
        expect(onRefreshCommands).toHaveBeenCalledWith(true);
        expect(onQuit).toHaveBeenCalledOnce();
    });
});

describe('dispatchHotkey channel filters', () => {
    afterEach(() => {
        LogStore.instance.clear();
    });

    it('solos the focused channel on space', async () => {
        await seedChannel('alpha');
        await seedChannel('beta');
        const setFilters = vi.fn();

        dispatchHotkey(makeCtx({ input: ' ', cursor: INITIAL_CURSOR, setFilters }));

        expect(setFilters).toHaveBeenCalledWith(filtersOf(['alpha']));
    });

    it('ignores the filter keys while the chips are collapsed', async () => {
        await seedChannel('alpha');
        const setFilters = vi.fn();
        const setCursor = vi.fn();

        for (const input of [' ', 'o']) {
            dispatchHotkey(makeCtx({ input, filterView: 'collapsed', setFilters, setCursor }));
        }

        expect(setFilters).not.toHaveBeenCalled();
        expect(setCursor).not.toHaveBeenCalled();
    });

    it('restores all on space when the focused channel is already solo', async () => {
        await seedChannel('alpha');
        const setFilters = vi.fn();

        dispatchHotkey(makeCtx({ input: ' ', cursor: INITIAL_CURSOR, filters: filtersOf(['alpha']), setFilters }));

        expect(setFilters).toHaveBeenCalledWith(filtersOf());
    });

    it('toggles the focused channel off on o, keeping the rest', async () => {
        await seedChannel('alpha');
        await seedChannel('beta');
        const setFilters = vi.fn();

        dispatchHotkey(makeCtx({ input: 'o', cursor: INITIAL_CURSOR, setFilters }));

        expect(setFilters).toHaveBeenCalledWith(filtersOf(['beta']));
    });

    it('keeps the rest off on o when the filter holds a channel that has not logged', async () => {
        await seedChannel('alpha');
        await seedChannel('beta');
        const setFilters = vi.fn();

        dispatchHotkey(makeCtx({ input: 'o', cursor: INITIAL_CURSOR, filters: filtersOf(['db']), setFilters }));

        expect(setFilters).toHaveBeenCalledWith(filtersOf(['db', 'alpha']));
    });

    it('restores all on o once every channel that logged is on', async () => {
        await seedChannel('alpha');
        await seedChannel('beta');
        const setFilters = vi.fn();

        dispatchHotkey(makeCtx({ input: 'o', cursor: INITIAL_CURSOR, filters: filtersOf(['db', 'beta']), setFilters }));

        expect(setFilters).toHaveBeenCalledWith(filtersOf());
    });

    it('toggles the focused level off on o, keeping the rest', () => {
        const setFilters = vi.fn();

        dispatchHotkey(makeCtx({ input: 'o', cursor: { ...INITIAL_CURSOR, group: 'levels' }, setFilters }));

        expect(setFilters).toHaveBeenCalledWith(filtersOf([], ['warn', 'info', 'debug', 'trace']));
    });

    it('does nothing on space or o when no channels exist', () => {
        const setFilters = vi.fn();

        dispatchHotkey(makeCtx({ input: ' ', cursor: INITIAL_CURSOR, setFilters }));
        dispatchHotkey(makeCtx({ input: 'o', cursor: INITIAL_CURSOR, setFilters }));

        expect(setFilters).not.toHaveBeenCalled();
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
        const setFilters = vi.fn();

        dispatchHotkey(makeCtx({ input: 't', scroll, setFilters }));
        dispatchHotkey(makeCtx({ input: 'o', scroll, setFilters }));

        expect(scroll.toTop).toHaveBeenCalledOnce();
        expect(setFilters).toHaveBeenCalledOnce();
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

// justified: the confirm path reads only the phase, the prompt, and the armed key off the state
function armedState(armed: Ctx['state']['armed']): Ctx['state'] {
    return { armed, commandUpdatePrompt: null, phase: 'running' } as unknown as Ctx['state'];
}

function storeSpy(spies: Record<string, unknown>): Ctx['store'] {
    return spies as unknown as Ctx['store'];
}

describe.each([
    { input: 'c', confirm: 'quit', begin: 'beginQuit', callback: 'onQuit' },
    { input: 'd', confirm: 'disconnect', begin: 'beginDisconnect', callback: 'onDisconnect' }
] as const)('dispatchHotkey ctrl-$input', ({ input, confirm, begin, callback }) => {
    it(`arms ${confirm} on the first press without running it`, () => {
        const run = vi.fn();
        const setArmed = vi.fn();

        dispatchHotkey(makeCtx({ input, key: key({ ctrl: true }), store: storeSpy({ setArmed }), [callback]: run }));

        expect(setArmed).toHaveBeenCalledWith(confirm);
        expect(run).not.toHaveBeenCalled();
    });

    it(`runs ${confirm} on the second press`, () => {
        const run = vi.fn();
        const beginSpy = vi.fn();

        dispatchHotkey(
            makeCtx({
                input,
                key: key({ ctrl: true }),
                state: armedState(confirm),
                store: storeSpy({ [begin]: beginSpy, setArmed: vi.fn() }),
                [callback]: run
            })
        );

        expect(beginSpy).toHaveBeenCalledOnce();
        expect(run).toHaveBeenCalledOnce();
    });

    it('disarms when any other key follows', () => {
        const setArmed = vi.fn();

        dispatchHotkey(
            makeCtx({
                key: key({ downArrow: true }),
                state: armedState(confirm),
                store: storeSpy({ setArmed }),
                scroll: scrollSpy()
            })
        );

        expect(setArmed).toHaveBeenCalledWith(null);
    });
});
