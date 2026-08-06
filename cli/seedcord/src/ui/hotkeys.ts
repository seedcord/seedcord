import { FILTER_LEVELS } from '@ui/components/primitives/FilterChips';
import { focusedIn, moveCursor } from '@ui/filterCursor';
import { isSessionLive } from '@ui/stores/devPhase';
import { LogStore } from '@ui/stores/LogStore';

import type { LogLevel } from '@seedcord/logger';
import type { CursorMove, FilterCursor } from '@ui/filterCursor';
import type { ScrollApi } from '@ui/hooks/useScroll';
import type { LogRow } from '@ui/logRows';
import type { DevState, DevStore } from '@ui/stores/DevStore';
import type { Key } from 'ink';

// empty set means all, so "all on" collapses back to empty and later channels stay visible by default
function toggleChannel(prev: ReadonlySet<string>, channel: string, all: readonly string[]): ReadonlySet<string> {
    const base = prev.size === 0 ? new Set(all) : new Set(prev);
    if (base.has(channel)) base.delete(channel);
    else base.add(channel);
    return base.size === all.length ? new Set<string>() : base;
}

function toggleLevel(prev: ReadonlySet<LogLevel>, level: LogLevel): ReadonlySet<LogLevel> {
    const base = prev.size === 0 ? new Set(FILTER_LEVELS) : new Set(prev);
    if (base.has(level)) base.delete(level);
    else base.add(level);
    return base.size === FILTER_LEVELS.length ? new Set<LogLevel>() : base;
}

// re-soloing the soloed item restores all (empty set = all)
function soloChannel(prev: ReadonlySet<string>, channel: string): ReadonlySet<string> {
    return prev.size === 1 && prev.has(channel) ? new Set<string>() : new Set([channel]);
}

function soloLevel(prev: ReadonlySet<LogLevel>, level: LogLevel): ReadonlySet<LogLevel> {
    return prev.size === 1 && prev.has(level) ? new Set<LogLevel>() : new Set([level]);
}

interface HotkeyContext {
    readonly input: string;
    readonly key: Key;
    readonly state: DevState;
    readonly interactive: boolean;
    readonly scroll: ScrollApi<LogRow>;
    readonly store: DevStore;
    readonly enabled: ReadonlySet<string>;
    readonly setEnabled: (next: ReadonlySet<string>) => void;
    readonly enabledLevels: ReadonlySet<LogLevel>;
    readonly setEnabledLevels: (next: ReadonlySet<LogLevel>) => void;
    readonly cursor: FilterCursor;
    readonly setCursor: (next: FilterCursor) => void;
    readonly filtersOpen: boolean; // to disable hotkeys that would otherwise move the cursor when the filter chips are closed
    readonly onQuit?: (() => Promise<void> | void) | undefined;
    readonly onDisconnect?: (() => Promise<void> | void) | undefined;
    readonly onRestart?: (() => Promise<void> | void) | undefined;
    readonly onRefreshCommands?: ((shouldRefresh: boolean) => Promise<void> | void) | undefined;
}

function quit(ctx: HotkeyContext): void {
    ctx.store.beginQuit();
    void ctx.onQuit?.();
}

// Ink puts stdin in raw mode, so Ctrl-C arrives as a plain keypress with no SIGINT.
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

function applyAtCursor(
    ctx: HotkeyContext,
    channels: readonly string[],
    onChannel: (prev: ReadonlySet<string>, channel: string, all: readonly string[]) => ReadonlySet<string>,
    onLevel: (prev: ReadonlySet<LogLevel>, level: LogLevel) => ReadonlySet<LogLevel>
): void {
    if (ctx.cursor.group === 'channels') {
        const index = focusedIn(ctx.cursor, 'channels', channels.length);
        const channel = index === null ? undefined : channels[index];
        if (channel !== undefined) ctx.setEnabled(onChannel(ctx.enabled, channel, channels));
        return;
    }
    const index = focusedIn(ctx.cursor, 'levels', FILTER_LEVELS.length);
    const level = index === null ? undefined : FILTER_LEVELS[index];
    if (level !== undefined) ctx.setEnabledLevels(onLevel(ctx.enabledLevels, level));
}

function handleFilters(ctx: HotkeyContext): boolean {
    if (!ctx.filtersOpen) return false;

    const channels = LogStore.instance.getChannels();
    const move = (dir: CursorMove): void =>
        ctx.setCursor(moveCursor(ctx.cursor, dir, channels.length, FILTER_LEVELS.length));

    if (ctx.key.leftArrow) move('left');
    else if (ctx.key.rightArrow) move('right');
    else if (ctx.key.tab) move('switch');
    else if (ctx.input === ' ') applyAtCursor(ctx, channels, soloChannel, soloLevel);
    else if (ctx.input === 'o') applyAtCursor(ctx, channels, toggleChannel, toggleLevel);
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
            if (!isSessionLive(state.phase)) return;
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

// first stage that returns true captures the keypress. the prompt captures all input while open
export function dispatchHotkey(ctx: HotkeyContext): void {
    if (handleQuitSignal(ctx)) return;
    if (ctx.state.quitArmed) ctx.store.setQuitArmed(false);
    if (handlePrompt(ctx)) return;
    if (handleFilters(ctx)) return;
    if (handleScroll(ctx)) return;
    handleActions(ctx);
}
