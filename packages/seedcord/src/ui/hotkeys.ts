import { isSessionLive } from '@ui/stores/devPhase';
import { LogStore } from '@ui/stores/LogStore';

import type { ScrollApi } from '@ui/hooks/useScroll';
import type { LogRow } from '@ui/logRows';
import type { DevState, DevStore } from '@ui/stores/DevStore';
import type { Key } from 'ink';

// Toggling a channel materializes the full list on first use, then flips one entry. When the result is "all
// on" again it collapses back to an empty set so channels that appear later stay visible by default.
function toggleChannel(prev: ReadonlySet<string>, channel: string, all: readonly string[]): ReadonlySet<string> {
    const base = prev.size === 0 ? new Set(all) : new Set(prev);
    if (base.has(channel)) base.delete(channel);
    else base.add(channel);
    return base.size === all.length ? new Set<string>() : base;
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
    readonly showToggles: boolean;
    readonly setShowToggles: (next: boolean) => void;
    readonly cursor: number;
    readonly setCursor: (next: number) => void;
    readonly onQuit?: (() => Promise<void> | void) | undefined;
    readonly onDisconnect?: (() => Promise<void> | void) | undefined;
    readonly onRestart?: (() => Promise<void> | void) | undefined;
    readonly onRefreshCommands?: ((shouldRefresh: boolean) => Promise<void> | void) | undefined;
}

function quit(ctx: HotkeyContext): void {
    ctx.store.beginQuit();
    void ctx.onQuit?.();
}

// Ink puts stdin in raw mode, so Ctrl-C arrives as a plain keypress with no SIGINT. Check it first so it always quits.
function handleQuitSignal(ctx: HotkeyContext): boolean {
    if (ctx.key.ctrl && ctx.input === 'c') {
        quit(ctx);
        return true;
    }
    return false;
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

function handleToggleMode(ctx: HotkeyContext): boolean {
    if (!ctx.showToggles) return false;
    const channels = LogStore.instance.getChannels();

    if (ctx.key.escape || ctx.key.return || ctx.input === 'c') {
        ctx.setShowToggles(false);
    } else if (ctx.key.upArrow && channels.length > 0) {
        ctx.setCursor((ctx.cursor + channels.length - 1) % channels.length);
    } else if (ctx.key.downArrow && channels.length > 0) {
        ctx.setCursor((ctx.cursor + 1) % channels.length);
    } else if (ctx.input === ' ') {
        const channel = channels[ctx.cursor];
        if (channel !== undefined) ctx.setEnabled(toggleChannel(ctx.enabled, channel, channels));
    }
    return true;
}

function handleScroll(ctx: HotkeyContext): boolean {
    // Runs before session actions, so scroll capture works even when non-interactive. t/b mirror Home/End.
    // The arrows, t, and b are used here, so a future single-letter action must pick something else.
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

// Session controls. `q` quits in any state. The rest apply once the UI is interactive.
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
            ctx.setCursor(0);
            ctx.setShowToggles(true);

            break;
        }
        case 'l': {
            LogStore.instance.clear();
            ctx.scroll.toBottom();

            break;
        }
        // No default
    }
}

// Single keyboard dispatcher for the dev UI: a keypress runs through these in order and stops at the first
// that handles it, the quit signal, then the prompt and toggle modes (which capture all input while open),
// then scroll, then session controls.
export function dispatchHotkey(ctx: HotkeyContext): void {
    if (handleQuitSignal(ctx)) return;
    if (handlePrompt(ctx)) return;
    if (handleToggleMode(ctx)) return;
    if (handleScroll(ctx)) return;
    handleActions(ctx);
}
