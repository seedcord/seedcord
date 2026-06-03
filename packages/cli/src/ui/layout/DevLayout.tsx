import { Box } from 'ink';
import React from 'react';

import { LogHeader } from '@ui/components/primitives/LogHeader';
import { NotificationStack } from '@ui/components/primitives/NotificationStack';
import { ScrollableLogView } from '@ui/components/primitives/ScrollableLogView';
import { Sidebar } from '@ui/components/primitives/Sidebar';
import { isStreaming } from '@ui/stores/devPhase';

import type { ScrollApi } from '@ui/hooks/useScroll';
import type { DevState } from '@ui/stores/DevStore';
import type { LogEntry } from '@ui/stores/LogStore';
import type { DOMElement } from 'ink';
import type { ReactElement, Ref } from 'react';

const MAX_RAIL = 40;
const MIN_RAIL = 26;
const RAIL_FRACTION = 0.32;

export interface DevLayoutProps {
    readonly state: DevState;
    readonly columns: number;
    // The shell measures this box to size the scroll window; it must be attached or the viewport is empty.
    readonly logBoxRef: Ref<DOMElement>;
    readonly scroll: ScrollApi<LogEntry>;
    readonly viewportHeight: number;
    readonly measured: boolean;
    readonly enabled: ReadonlySet<string>;
    readonly showToggles: boolean;
    readonly cursor: number;
    readonly interactive: boolean;
    readonly uptimeMs: number | null;
}

// Left rail (banner, status, channel filter, hotkeys) and a wide right column for logs, separated by a
// vertical divider. The log column shows its live/scroll status on top, then the scrolling logs, then
// notification cards docked beneath where there's room for stack traces.
export function DevLayout(props: DevLayoutProps): ReactElement {
    const { state, columns, logBoxRef, scroll, viewportHeight, measured } = props;
    const { enabled, showToggles, cursor, interactive, uptimeMs } = props;
    const railWidth = Math.min(MAX_RAIL, Math.max(MIN_RAIL, Math.floor(columns * RAIL_FRACTION)));

    return (
        <Box flexGrow={1}>
            <Sidebar
                state={state}
                enabled={enabled}
                uptimeMs={uptimeMs}
                following={scroll.following}
                interactive={interactive}
                showToggles={showToggles}
                cursor={cursor}
                width={railWidth}
            />
            <Box
                flexDirection="column"
                flexGrow={1}
                borderStyle="single"
                borderColor="gray"
                borderTop={false}
                borderRight={false}
                borderBottom={false}
                paddingLeft={1}
                overflow="hidden"
            >
                <LogHeader following={scroll.following} below={scroll.below} live={isStreaming(state.phase)} />
                <Box ref={logBoxRef} flexGrow={1} overflow="hidden">
                    <ScrollableLogView visible={scroll.visible} viewportHeight={viewportHeight} measured={measured} />
                </Box>
                <NotificationStack
                    error={state.error}
                    restartRequired={state.restartRequired}
                    prompt={state.commandUpdatePrompt}
                />
            </Box>
        </Box>
    );
}
