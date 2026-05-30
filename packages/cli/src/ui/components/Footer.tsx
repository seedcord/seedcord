import { Box, Text } from 'ink';
import React from 'react';

import { isSessionLive } from '@ui/stores/devPhase';

import type { DevPhase } from '@ui/stores/devPhase';
import type { ReactElement } from 'react';

export type FooterMode = 'default' | 'prompt' | 'channels';

interface FooterProps {
    readonly phase: DevPhase;
    readonly interactive: boolean;
    readonly mode: FooterMode;
}

interface HotkeyProps {
    readonly keyLabel: string;
    readonly action: string;
    readonly enabled?: boolean;
    readonly highlight?: boolean;
}

function Hotkey({ keyLabel, action, enabled = true, highlight = false }: HotkeyProps): ReactElement {
    const keyColor = !enabled ? 'gray' : highlight ? 'yellow' : 'cyan';
    return (
        <Box marginRight={2}>
            <Text color={keyColor} bold>
                {keyLabel}
            </Text>
            <Text dimColor> {action}</Text>
        </Box>
    );
}

// r is the suggested action once a session settles into a state the user recovers from with a restart.
const RESTART_HINT_PHASES = new Set<DevPhase>(['restart-required', 'disconnected', 'error']);

function DefaultBar({ phase, interactive }: { phase: DevPhase; interactive: boolean }): ReactElement {
    return (
        <>
            <Hotkey keyLabel="q" action="quit" />
            <Hotkey keyLabel="r" action="restart" enabled={interactive} highlight={RESTART_HINT_PHASES.has(phase)} />
            <Hotkey keyLabel="d" action="disconnect" enabled={interactive && isSessionLive(phase)} />
            <Hotkey keyLabel="c" action="channels" enabled={interactive} />
            <Hotkey keyLabel="l" action="clear logs" enabled={interactive} />
        </>
    );
}

export function Footer({ phase, interactive, mode }: FooterProps): ReactElement {
    return (
        <Box borderStyle="single" borderColor="gray" borderBottom={false} borderLeft={false} borderRight={false}>
            {mode === 'prompt' && (
                <>
                    <Hotkey keyLabel="y" action="refresh commands" highlight />
                    <Hotkey keyLabel="n" action="skip" />
                </>
            )}
            {mode === 'channels' && (
                <>
                    <Hotkey keyLabel="↑↓" action="navigate" />
                    <Hotkey keyLabel="↵" action="select" />
                    <Hotkey keyLabel="esc" action="close" />
                </>
            )}
            {mode === 'default' && <DefaultBar phase={phase} interactive={interactive} />}
        </Box>
    );
}
