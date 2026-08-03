import { Box, Text } from 'ink';
import React from 'react';

import { ui } from '@ui/palette';
import { isSessionLive } from '@ui/stores/devPhase';

import type { DevPhase } from '@ui/stores/devPhase';
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
        <Box marginRight={2}>
            <Text color={keyColor} bold>
                {keyLabel}
            </Text>
            <Text color={actionColor}> {action}</Text>
        </Box>
    );
}

const RESTART_HINT_PHASES = new Set<DevPhase>(['restart-required', 'disconnected', 'error']);

interface SessionKeysProps {
    readonly phase: DevPhase;
    readonly interactive: boolean;
    readonly following: boolean;
}

export function SessionKeys({ phase, interactive, following }: SessionKeysProps): ReactElement {
    return (
        <Box flexDirection="column">
            <Hotkey keyLabel="q" action="quit" />
            <Hotkey keyLabel="r" action="restart" enabled={interactive} highlight={RESTART_HINT_PHASES.has(phase)} />
            <Hotkey keyLabel="d" action="disconnect" enabled={interactive && isSessionLive(phase)} />
            <Hotkey keyLabel="l" action="clear" enabled={interactive} />
            <Hotkey keyLabel="↑↓" action="scroll" />
            <Hotkey keyLabel="t/b" action="top/bottom" highlight={!following} />
        </Box>
    );
}

export function FilterKeys(): ReactElement {
    return (
        <Box flexDirection="column">
            <Hotkey keyLabel="←→" action="select" />
            <Hotkey keyLabel="tab" action="group" />
            <Hotkey keyLabel="space" action="filter" />
            <Hotkey keyLabel="o" action="toggle" />
        </Box>
    );
}
