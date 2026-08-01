import { Box, Text } from 'ink';
import React from 'react';

import { ui } from '@ui/palette';

import { Banner } from '../Banner';
import { StatusBadge } from '../StatusBadge';

import type { Notice } from '@ui/notices';
import type { DevState } from '@ui/stores/DevStore';
import type { ReactElement } from 'react';

const HINT = '⇅ resize for full ui';

// below this the right slot would crowd out the summary, and the phase chip still shows the state
const RIGHT_COLUMNS = 64;

interface StatusLineProps {
    readonly state: DevState;
    readonly notices: readonly Notice[];
    readonly columns: number;
}

/** The single row standing in for the rail once the terminal is too small to hold it. */
export function StatusLine({ state, notices, columns }: StatusLineProps): ReactElement {
    const [top, ...rest] = notices;

    return (
        <Box flexShrink={0} justifyContent="space-between">
            <Box flexShrink={1} overflow="hidden">
                <Text wrap="truncate">
                    <Banner version={null} /> <StatusBadge phase={state.phase} glyph="live" />
                    {top?.summary ? <Text dimColor> · </Text> : null}
                    {top?.summary ? <Text color={ui.warn}>{top.summary}</Text> : null}
                    {rest.length > 0 ? <Text dimColor> · +{rest.length}</Text> : null}
                </Text>
            </Box>
            {columns < RIGHT_COLUMNS ? null : (
                // flexShrink 0 and the margin keep the key readable against a summary that fills the row
                <Box flexShrink={0} marginLeft={2}>
                    {top ? (
                        <Text bold color={ui.accent}>
                            {top.action}
                        </Text>
                    ) : (
                        <Text dimColor>{HINT}</Text>
                    )}
                </Box>
            )}
        </Box>
    );
}
