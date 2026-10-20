import { Box, Text } from 'ink';
import React from 'react';

import { keyIsLive } from '#ui/hotkeys';
import { ui } from '#ui/palette';

import type { KeyGate } from '#ui/hotkeys';
import type { DevPhase } from '#ui/stores/devPhase';
import type { ReactElement } from 'react';

interface HotkeyProps {
    readonly keyLabel: string;
    readonly action: string;
    readonly enabled?: boolean;
    readonly highlight?: boolean;
}

function Hotkey({ keyLabel, action, enabled = true, highlight = false }: HotkeyProps): ReactElement {
    const keyColor = !enabled ? ui.faint : highlight ? ui.warn : ui.accent;
    const actionColor = enabled ? ui.muted : ui.faint;
    return (
        <Box flexShrink={0}>
            <Text color={keyColor} bold>
                {keyLabel}
            </Text>
            <Text color={actionColor}> {action}</Text>
        </Box>
    );
}

const RESTART_HINT_PHASES = new Set<DevPhase>(['restart-required', 'disconnected', 'error']);

interface SessionKeysProps {
    readonly gate: KeyGate;
    readonly following: boolean;
}

export function SessionKeys({ gate, following }: SessionKeysProps): ReactElement {
    return (
        <Box flexDirection="column">
            <Hotkey keyLabel="q" action="quit" />
            <Hotkey
                keyLabel="r"
                action="restart"
                enabled={keyIsLive('r', gate)}
                highlight={RESTART_HINT_PHASES.has(gate.state.phase)}
            />
            <Hotkey keyLabel="d" action="disconnect" enabled={keyIsLive('d', gate)} />
            <Hotkey keyLabel="c" action="clear" enabled={keyIsLive('c', gate)} />
            <Hotkey keyLabel="↑↓" action="scroll" />
            <Hotkey keyLabel="t/b" action="top/bottom" highlight={!following} />
        </Box>
    );
}

// the keys a rail lists for how the screen looks
export function ViewKeys({ fullDetails }: { readonly fullDetails: boolean }): ReactElement {
    return (
        <Box flexDirection="column">
            <RailKey shown />
            <DetailsKey full={fullDetails} />
        </Box>
    );
}

export function RailKey({ shown }: { readonly shown: boolean }): ReactElement {
    return <Hotkey keyLabel="s" action={shown ? 'hide rail' : 'show rail'} />;
}

export function DetailsKey({ full }: { readonly full: boolean }): ReactElement {
    return <Hotkey keyLabel="p" action={full ? 'auto details' : 'full details'} />;
}

export function FilterKeys({ direction = 'column' }: { readonly direction?: 'column' | 'row' }): ReactElement {
    return (
        <Box flexDirection={direction} flexWrap="wrap" columnGap={2}>
            <Hotkey keyLabel="←→" action="select" />
            <Hotkey keyLabel="tab" action="group" />
            <Hotkey keyLabel="space" action="filter" />
            <Hotkey keyLabel="o" action="toggle" />
        </Box>
    );
}

export function FiltersKey({ shown }: { readonly shown: boolean }): ReactElement {
    return <Hotkey keyLabel="f" action={shown ? 'back' : 'filters'} />;
}
