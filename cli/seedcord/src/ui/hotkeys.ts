import { FILTER_LEVELS } from '#ui/components/primitives/FilterChips';
import { CONFIRMS } from '#ui/confirms';
import { focusedIn, moveCursor } from '#ui/filterCursor';
import { isStreaming } from '#ui/stores/devPhase';
import { LogStore } from '#ui/stores/LogStore';

import type { Confirmable } from '#ui/confirms';
import type { LogFilters } from '#ui/devPrefs';
import type { CursorMove, FilterCursor } from '#ui/filterCursor';
import type { ScrollApi } from '#ui/hooks/useScroll';
import type { LogRow } from '#ui/logRows';
import type { FilterView } from '#ui/Screen';
import type { DevState, DevStore } from '#ui/stores/DevStore';
import type { Key } from 'ink';

type FilterChange = <ItemT>(prev: ReadonlySet<ItemT>, item: ItemT, all: readonly ItemT[]) => ReadonlySet<ItemT>;

// empty means every item, including channels that log later
const toggle: FilterChange = (prev, item, all) => {
    const base = new Set(prev.size === 0 ? all : prev);
    if (base.has(item)) base.delete(item);
    else base.add(item);
    return all.every((each) => base.has(each)) ? new Set() : base;
};

const solo: FilterChange = (prev, item) => (prev.size === 1 && prev.has(item) ? new Set() : new Set([item]));

interface HotkeyContext {
    readonly input: string;
    readonly key: Key;
    readonly state: DevState;
    readonly interactive: boolean;
    readonly scroll: ScrollApi<LogRow>;
    readonly store: DevStore;
    readonly filters: LogFilters;
    readonly setFilters: (next: LogFilters) => void;
    readonly filterView: FilterView;
    readonly toggleFilterView: () => void;
    readonly canToggleRail: boolean;
    readonly toggleRail: () => void;
    readonly cycleDetails: () => void;
    readonly cursor: FilterCursor;
    readonly setCursor: (next: FilterCursor) => void;
    readonly onQuit?: (() => Promise<void> | void) | undefined;
    readonly onDisconnect?: (() => Promise<void> | void) | undefined;
    readonly onRestart?: (() => Promise<void> | void) | undefined;
    readonly onRefreshCommands?: ((shouldRefresh: boolean) => Promise<void> | void) | undefined;
}

type KeyGate = Pick<HotkeyContext, 'state' | 'interactive' | 'filterView' | 'canToggleRail'>;
export type SessionGate = Pick<KeyGate, 'state' | 'interactive'>;

interface Binding {
    readonly when?: (gate: KeyGate) => boolean;
    readonly confirm?: Confirmable;
    readonly run: (ctx: HotkeyContext) => void;
}

const prompting = (gate: Pick<KeyGate, 'state'>): boolean => gate.state.commandUpdatePrompt !== null;
const sessionOpen = (gate: SessionGate): boolean => gate.interactive && !prompting(gate);
const canDisconnect = (gate: SessionGate): boolean => sessionOpen(gate) && isStreaming(gate.state.phase);
const chipsToggle = (gate: KeyGate): boolean => gate.filterView !== 'always';
const chipsOpen = (gate: KeyGate): boolean => gate.filterView !== 'collapsed';
const canToggleRail = (gate: KeyGate): boolean => gate.canToggleRail;

type Action = (ctx: HotkeyContext) => void;

function changeChip(change: FilterChange): Action {
    return (ctx) => {
        const { filters } = ctx;
        const channels = LogStore.instance.getChannels();
        if (ctx.cursor.group === 'channels') {
            const index = focusedIn(ctx.cursor, 'channels', channels.length);
            const channel = index === null ? undefined : channels[index];
            if (channel === undefined) return;
            ctx.setFilters({ ...filters, channels: change(filters.channels, channel, channels) });
            return;
        }
        const index = focusedIn(ctx.cursor, 'levels', FILTER_LEVELS.length);
        const level = index === null ? undefined : FILTER_LEVELS[index];
        if (level === undefined) return;
        ctx.setFilters({ ...filters, levels: change(filters.levels, level, FILTER_LEVELS) });
    };
}

function moveChip(move: CursorMove): Action {
    return (ctx) => {
        const channelCount = LogStore.instance.getChannels().length;
        ctx.setCursor(moveCursor(ctx.cursor, move, channelCount, FILTER_LEVELS.length));
    };
}

function answer(shouldRefresh: boolean): Action {
    return (ctx) => void ctx.onRefreshCommands?.(shouldRefresh);
}

const quit: Action = (ctx) => {
    ctx.store.beginQuit();
    void ctx.onQuit?.();
};
const disconnect: Action = (ctx) => {
    ctx.store.beginDisconnect();
    void ctx.onDisconnect?.();
};
const restart: Action = (ctx) => void ctx.onRestart?.();
const clearLogs: Action = (ctx) => {
    LogStore.instance.clear();
    ctx.scroll.toBottom();
};
const toggleChips: Action = (ctx) => ctx.toggleFilterView();
const toggleRail: Action = (ctx) => ctx.toggleRail();
const cycleDetails: Action = (ctx) => ctx.cycleDetails();
const scrollUp: Action = (ctx) => ctx.scroll.up();
const scrollDown: Action = (ctx) => ctx.scroll.down();
const pageUp: Action = (ctx) => ctx.scroll.pageUp();
const pageDown: Action = (ctx) => ctx.scroll.pageDown();
const toTop: Action = (ctx) => ctx.scroll.toTop();
const toBottom: Action = (ctx) => ctx.scroll.toBottom();

// in ink's raw mode, ctrl-c arrives as a keypress with no SIGINT
const KEYMAP = {
    [CONFIRMS.quit.key]: { confirm: 'quit', run: quit },
    [CONFIRMS.disconnect.key]: { confirm: 'disconnect', when: canDisconnect, run: disconnect },
    y: { when: prompting, run: answer(true) },
    n: { when: prompting, run: answer(false) },
    f: { when: chipsToggle, run: toggleChips },
    s: { when: canToggleRail, run: toggleRail },
    p: { run: cycleDetails },
    leftArrow: { when: chipsOpen, run: moveChip('left') },
    rightArrow: { when: chipsOpen, run: moveChip('right') },
    tab: { when: chipsOpen, run: moveChip('switch') },
    ' ': { when: chipsOpen, run: changeChip(solo) },
    o: { when: chipsOpen, run: changeChip(toggle) },
    upArrow: { run: scrollUp },
    downArrow: { run: scrollDown },
    pageUp: { run: pageUp },
    pageDown: { run: pageDown },
    t: { run: toTop },
    home: { run: toTop },
    b: { run: toBottom },
    end: { run: toBottom },
    q: { run: quit },
    r: { when: sessionOpen, run: restart },
    d: { when: canDisconnect, run: disconnect },
    c: { when: sessionOpen, run: clearLogs }
} satisfies Record<string, Binding>;

const BINDINGS: ReadonlyMap<string, Binding> = new Map(Object.entries(KEYMAP));

const SPECIAL_KEYS = [
    'upArrow',
    'downArrow',
    'leftArrow',
    'rightArrow',
    'pageUp',
    'pageDown',
    'home',
    'end',
    'tab'
] as const satisfies readonly (keyof Key)[];

function keyIdOf(input: string, key: Key): string {
    const special = SPECIAL_KEYS.find((name) => key[name]);
    if (special) return special;
    return key.ctrl ? `ctrl+${input}` : input;
}

function isLive(binding: Binding, gate: KeyGate): boolean {
    return binding.when?.(gate) ?? true;
}

export function sessionKeyIsLive(id: 'r' | 'd' | 'c', gate: SessionGate): boolean {
    return KEYMAP[id].when(gate);
}

// r and d abort startup.
// CommandRegistry stops waiting on an aborted deploy
export function acceptsSessionKeys(state: Pick<DevState, 'phase' | 'isBusy' | 'restartRequired'>): boolean {
    return !state.isBusy || state.restartRequired || state.phase === 'starting';
}

export function dispatchHotkey(ctx: HotkeyContext): void {
    const found = BINDINGS.get(keyIdOf(ctx.input, ctx.key));
    const binding = found && isLive(found, ctx) ? found : undefined;

    if (binding?.confirm && ctx.state.armed !== binding.confirm) {
        ctx.store.setArmed(binding.confirm);
        return;
    }
    if (ctx.state.armed !== null) ctx.store.setArmed(null);
    binding?.run(ctx);
}
