import { Box } from 'ink';
import React from 'react';

import { LogHeader } from '@ui/components/primitives/LogHeader';
import { NotificationStack } from '@ui/components/primitives/NotificationStack';
import { ScrollableLogView } from '@ui/components/primitives/ScrollableLogView';
import { Sidebar } from '@ui/components/primitives/Sidebar';

import type { LogLevel } from '@seedcord/logger';
import type { FilterCursor } from '@ui/filterCursor';
import type { ScrollApi } from '@ui/hooks/useScroll';
import type { LogRow } from '@ui/logRows';
import type { DevState } from '@ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement, Ref } from 'react';

export interface DevLayoutProps {
    readonly state: DevState;
    // measured once per run and held until the next restart, null before the measurement completes
    readonly railRef: Ref<DOMElement>;
    readonly railWidth: number | null;
    // the shell measures this box to size the scroll window. it must be attached or the viewport is empty
    readonly logBoxRef: Ref<DOMElement>;
    readonly scroll: ScrollApi<LogRow>;
    readonly viewportHeight: number;
    readonly measured: boolean;
    readonly enabled: ReadonlySet<string>;
    readonly enabledLevels: ReadonlySet<LogLevel>;
    readonly cursor: FilterCursor;
    readonly interactive: boolean;
    readonly uptimeMs: number | null;
}

// notification cards render below the logs so stack traces have room
export function DevLayout(props: DevLayoutProps): ReactElement {
    const { state, railRef, railWidth, logBoxRef, scroll, viewportHeight, measured } = props;
    const { enabled, enabledLevels, cursor, interactive, uptimeMs } = props;

    return (
        <Box flexGrow={1}>
            <Sidebar
                ref={railRef}
                state={state}
                enabled={enabled}
                enabledLevels={enabledLevels}
                uptimeMs={uptimeMs}
                following={scroll.following}
                interactive={interactive}
                cursor={cursor}
                width={railWidth}
            />
            <Box
                flexDirection="column"
                flexGrow={1}
                minWidth={0}
                borderStyle="single"
                borderColor="gray"
                borderTop={false}
                borderRight={false}
                borderBottom={false}
                paddingLeft={1}
                overflow="hidden"
            >
                <LogHeader following={scroll.following} below={scroll.below} />
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
