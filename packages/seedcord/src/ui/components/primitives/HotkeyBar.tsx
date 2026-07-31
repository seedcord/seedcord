import { Box, Text } from 'ink';
import React from 'react';

import { ui } from '@ui/palette';
import { isSessionLive } from '@ui/stores/devPhase';

import type { DevPhase } from '@ui/stores/devPhase';
import type { ReactElement } from 'react';

type HotkeyBarMode = 'default' | 'toggles';

interface HotkeyBarProps {
    readonly phase: DevPhase;
    readonly interactive: boolean;
    readonly mode: HotkeyBarMode;
    readonly following: boolean;
}

interface HotkeyProps {
    readonly keyLabel: string;
    readonly action: string;
    readonly enabled?: boolean;
    readonly highlight?: boolean;
}

function Hotkey({ keyLabel, action, enabled = true, highlight = false }: HotkeyProps): ReactElement {
    // a disabled row goes faint on both the key and the action, so it recedes as a unit
    const keyColor = !enabled ? ui.faint : highlight ? ui.warn : ui.accent;
    const actionColor = enabled ? ui.muted : ui.faint;
    return (
        <Box marginRight={2}>
            <Text color={keyColor} bold>
                {keyLabel}
            </Text>
            <Text color={actionColor}> {action}</Text>
        </Box>
    );
}

// Highlight r in the phases the user recovers from with a restart.
const RESTART_HINT_PHASES = new Set<DevPhase>(['restart-required', 'disconnected', 'error']);

function DefaultKeys({
    phase,
    interactive,
    following
}: {
    phase: DevPhase;
    interactive: boolean;
    following: boolean;
}): ReactElement {
    return (
        <>
            <Hotkey keyLabel="q" action="quit" />
            <Hotkey keyLabel="r" action="restart" enabled={interactive} highlight={RESTART_HINT_PHASES.has(phase)} />
            <Hotkey keyLabel="d" action="disconnect" enabled={interactive && isSessionLive(phase)} />
            <Hotkey keyLabel="f" action="filters" enabled={interactive} />
            <Hotkey keyLabel="l" action="clear" enabled={interactive} />
            <Hotkey keyLabel="↑↓" action="scroll" />
            <Hotkey keyLabel="t/b" action="top/bottom" highlight={!following} />
        </>
    );
}

export function HotkeyBar({ phase, interactive, mode, following }: HotkeyBarProps): ReactElement {
    return (
        <Box flexDirection="column" flexWrap="wrap">
            {mode === 'toggles' && (
                <>
                    <Hotkey keyLabel="←→" action="move" />
                    <Hotkey keyLabel="tab" action="group" />
                    <Hotkey keyLabel="space" action="solo" />
                    <Hotkey keyLabel="t" action="toggle" />
                    <Hotkey keyLabel="↑↓" action="scroll" />
                    <Hotkey keyLabel="↵/esc" action="done" />
                </>
            )}
            {mode === 'default' && <DefaultKeys phase={phase} interactive={interactive} following={following} />}
        </Box>
    );
}
