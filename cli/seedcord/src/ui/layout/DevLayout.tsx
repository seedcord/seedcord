import { Box } from 'ink';
import React from 'react';

import { FilterPanel } from '#ui/components/primitives/FilterPanel';
import { LogHeader } from '#ui/components/primitives/LogHeader';
import { NotificationStack } from '#ui/components/primitives/NotificationStack';
import { Rule } from '#ui/components/primitives/Rule';
import { ScrollableLogView } from '#ui/components/primitives/ScrollableLogView';
import { Sidebar } from '#ui/components/primitives/Sidebar';
import { StatusLine } from '#ui/components/primitives/StatusLine';

import type { ScrollableLogViewProps } from '#ui/components/primitives/ScrollableLogView';
import type { LogFilters } from '#ui/devPrefs';
import type { FilterCursor } from '#ui/filterCursor';
import type { PanelFit } from '#ui/hooks/usePanelFit';
import type { ScrollApi } from '#ui/hooks/useScroll';
import type { LogRow } from '#ui/logRows';
import type { Notice } from '#ui/notices';
import type { FilterView, Screen } from '#ui/Screen';
import type { DevState } from '#ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement, Ref } from 'react';

export interface DevLayoutProps extends Pick<ScrollableLogViewProps, 'viewportHeight' | 'measured'> {
    readonly state: DevState;
    readonly screen: Screen;
    readonly notices: readonly Notice[];
    readonly railRef: Ref<DOMElement>;
    // measured once per run and held until the next restart, null before the measurement completes
    readonly railWidth: number | null;
    // the shell measures this box to size the scroll window. it must be attached or the viewport is empty
    readonly logBoxRef: Ref<DOMElement>;
    readonly scroll: ScrollApi<LogRow>;
    readonly logLayout: ScrollableLogViewProps['layout'];
    readonly filters: LogFilters;
    readonly filterView: FilterView;
    readonly panelFit: PanelFit;
    readonly cursor: FilterCursor;
    readonly interactive: boolean;
    readonly uptimeMs: number | null;
}

// notification cards render below the logs so stack traces have room
export function DevLayout(props: DevLayoutProps): ReactElement {
    const { state, screen, notices, railRef, railWidth, logBoxRef, scroll, logLayout, viewportHeight, measured } =
        props;
    const { filters, filterView, panelFit, cursor, interactive, uptimeMs } = props;
    const railed = screen.rail !== null;

    return (
        <Box flexGrow={1}>
            {railed ? (
                <Sidebar
                    ref={railRef}
                    state={state}
                    filters={filters}
                    uptimeMs={uptimeMs}
                    following={scroll.following}
                    interactive={interactive}
                    cursor={cursor}
                    width={railWidth}
                    view={filterView}
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
                {screen.header === 'line' ? (
                    <>
                        <StatusLine
                            state={state}
                            notices={notices}
                            filtered={filters.channels.size > 0 || filters.levels.size > 0}
                            filtersShown={filterView === 'shown'}
                        />
                        <Rule />
                    </>
                ) : null}
                {screen.filters === 'pane-on-f' && filterView === 'shown' ? (
                    <FilterPanel filters={filters} cursor={cursor} {...panelFit} />
                ) : (
                    <>
                        <LogHeader following={scroll.following} below={scroll.below} />
                        {/* the notification stack is unbounded, so the pane keeps a row back for its own message */}
                        <Box ref={logBoxRef} flexGrow={1} minHeight={1} overflow="hidden">
                            <ScrollableLogView
                                visible={scroll.visible}
                                layout={logLayout}
                                viewportHeight={viewportHeight}
                                measured={measured}
                            />
                        </Box>
                    </>
                )}
                {screen.cards ? <NotificationStack notices={notices} /> : null}
            </Box>
        </Box>
    );
}
