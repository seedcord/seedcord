import { Box } from 'ink';
import React from 'react';

import { LogHeader } from '#ui/components/primitives/LogHeader';
import { NotificationStack } from '#ui/components/primitives/NotificationStack';
import { Rule } from '#ui/components/primitives/Rule';
import { ScrollableLogView } from '#ui/components/primitives/ScrollableLogView';
import { Sidebar } from '#ui/components/primitives/Sidebar';
import { StatusLine } from '#ui/components/primitives/StatusLine';

import type { FilterCursor } from '#ui/filterCursor';
import type { ScrollApi } from '#ui/hooks/useScroll';
import type { LogRow } from '#ui/logRows';
import type { Notice } from '#ui/notices';
import type { DevState } from '#ui/stores/DevStore';
import type { Tier } from '#ui/tier';
import type { LogLevel } from '@seedcord/logger';
import type { DOMElement } from 'ink';
import type { ReactElement, Ref } from 'react';

export interface DevLayoutProps {
    readonly state: DevState;
    readonly tier: Tier;
    readonly notices: readonly Notice[];
    readonly railRef: Ref<DOMElement>;
    // measured once per run and held until the next restart, null before the measurement completes
    readonly railWidth: number | null;
    // the shell measures this box to size the scroll window. it must be attached or the viewport is empty
    readonly logBoxRef: Ref<DOMElement>;
    readonly scroll: ScrollApi<LogRow>;
    readonly viewportHeight: number;
    readonly measured: boolean;
    readonly columns: number;
    readonly enabled: ReadonlySet<string>;
    readonly enabledLevels: ReadonlySet<LogLevel>;
    readonly cursor: FilterCursor;
    readonly interactive: boolean;
    readonly uptimeMs: number | null;
}

// notification cards render below the logs so stack traces have room
export function DevLayout(props: DevLayoutProps): ReactElement {
    const { state, tier, notices, railRef, railWidth, logBoxRef, scroll, viewportHeight, measured } = props;
    const { columns, enabled, enabledLevels, cursor, interactive, uptimeMs } = props;
    const railed = tier === 'full' || tier === 'compact';

    return (
        <Box flexGrow={1}>
            {railed ? (
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
                    filtersOpen={tier === 'full'}
                />
            ) : null}
            <Box
                flexDirection="column"
                flexGrow={1}
                minWidth={0}
                borderStyle="single"
                borderColor="gray"
                borderTop={false}
                borderRight={false}
                borderBottom={false}
                borderLeft={railed}
                paddingLeft={railed ? 1 : 0}
                overflow="hidden"
            >
                {railed ? null : <StatusLine state={state} notices={notices} columns={columns} />}
                {railed ? null : <Rule />}
                <LogHeader following={scroll.following} below={scroll.below} />
                {/* the notification stack is unbounded, so the pane keeps a row back for its own message */}
                <Box ref={logBoxRef} flexGrow={1} minHeight={1} overflow="hidden">
                    <ScrollableLogView visible={scroll.visible} viewportHeight={viewportHeight} measured={measured} />
                </Box>
                {railed ? <NotificationStack notices={notices} /> : null}
            </Box>
        </Box>
    );
}
