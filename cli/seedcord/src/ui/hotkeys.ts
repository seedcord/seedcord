import { FILTER_LEVELS } from '#ui/components/primitives/FilterChips';
import { focusedIn, moveCursor } from '#ui/filterCursor';
import { isStreaming } from '#ui/stores/devPhase';
import { LogStore } from '#ui/stores/LogStore';

import type { LogFilters } from '#ui/devPrefs';
import type { CursorMove, FilterCursor } from '#ui/filterCursor';
import type { FilterView } from '#ui/hooks/useFilters';
import type { ScrollApi } from '#ui/hooks/useScroll';
import type { LogRow } from '#ui/logRows';
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
    readonly cursor: FilterCursor;
    readonly setCursor: (next: FilterCursor) => void;
    readonly onQuit?: (() => Promise<void> | void) | undefined;
    readonly onDisconnect?: (() => Promise<void> | void) | undefined;
    readonly onRestart?: (() => Promise<void> | void) | undefined;
    readonly onRefreshCommands?: ((shouldRefresh: boolean) => Promise<void> | void) | undefined;
}

function quit(ctx: HotkeyContext): void {
    ctx.store.beginQuit();
    void ctx.onQuit?.();
}

// ink puts stdin in raw mode, so ctrl-c arrives as a plain keypress with no sigint
function handleQuitSignal(ctx: HotkeyContext): boolean {
    if (!ctx.key.ctrl || ctx.input !== 'c') return false;

    if (ctx.state.quitArmed) quit(ctx);
    else ctx.store.setQuitArmed(true);
    return true;
}

function handlePrompt(ctx: HotkeyContext): boolean {
    if (!ctx.state.commandUpdatePrompt) return false;
    if (ctx.input === 'y') {
        void ctx.onRefreshCommands?.(true);
        ctx.store.clearPrompt();
    } else if (ctx.input === 'n') {
        void ctx.onRefreshCommands?.(false);
        ctx.store.clearPrompt();
    }
    return true;
}

function applyAtCursor(ctx: HotkeyContext, channels: readonly string[], change: FilterChange): void {
    const { filters } = ctx;
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
}

function handleFilters(ctx: HotkeyContext): boolean {
    if (ctx.input === 'f' && ctx.filterView !== 'always') {
        ctx.toggleFilterView();
        return true;
    }
    if (ctx.filterView === 'collapsed') return false;

    const channels = LogStore.instance.getChannels();
    const move = (dir: CursorMove): void =>
        ctx.setCursor(moveCursor(ctx.cursor, dir, channels.length, FILTER_LEVELS.length));

    if (ctx.key.leftArrow) move('left');
    else if (ctx.key.rightArrow) move('right');
    else if (ctx.key.tab) move('switch');
    else if (ctx.input === ' ') applyAtCursor(ctx, channels, solo);
    else if (ctx.input === 'o') applyAtCursor(ctx, channels, toggle);
    else return false;
    return true;
}

function handleScroll(ctx: HotkeyContext): boolean {
    // runs before session actions so scroll works even when non-interactive
    const { key, input, scroll } = ctx;
    if (key.upArrow) scroll.up();
    else if (key.downArrow) scroll.down();
    else if (key.pageUp) scroll.pageUp();
    else if (key.pageDown) scroll.pageDown();
    else if (key.home || input === 't') scroll.toTop();
    else if (key.end || input === 'b') scroll.toBottom();
    else return false;
    return true;
}

function handleActions(ctx: HotkeyContext): void {
    const { input, state, store } = ctx;

    if (input === 'q') {
        quit(ctx);
        return;
    }
    if (!ctx.interactive) return;

    switch (input) {
        case 'd': {
            if (!isStreaming(state.phase)) return;
            store.beginDisconnect();
            void ctx.onDisconnect?.();

            break;
        }
        case 'r': {
            store.beginRestart();
            void ctx.onRestart?.();

            break;
        }
        case 'c': {
            LogStore.instance.clear();
            ctx.scroll.toBottom();

            break;
        }
        // No default
    }
}

// CommandRegistry stops waiting on an aborted deploy
export function acceptsSessionKeys(state: Pick<DevState, 'phase' | 'isBusy' | 'restartRequired'>): boolean {
    return !state.isBusy || state.restartRequired || state.phase === 'starting';
}

// dispatch checks the prompt before filters. an open y/n prompt would otherwise lose keys to filter hotkeys
export function dispatchHotkey(ctx: HotkeyContext): void {
    if (handleQuitSignal(ctx)) return;
    if (ctx.state.quitArmed) ctx.store.setQuitArmed(false);
    if (handlePrompt(ctx)) return;
    if (handleFilters(ctx)) return;
    if (handleScroll(ctx)) return;
    handleActions(ctx);
}
