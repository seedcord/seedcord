import { Box, Text } from 'ink';
import React from 'react';

import { Banner } from '#ui/components/Banner';
import { StatusBadge } from '#ui/components/StatusBadge';
import { ui } from '#ui/palette';

import { FiltersKey } from './Hotkeys';

import type { Notice } from '#ui/notices';
import type { DevState } from '#ui/stores/DevStore';
import type { ReactElement, ReactNode } from 'react';

interface StatusLineProps {
    readonly state: DevState;
    readonly notices: readonly Notice[];
    readonly filtered: boolean;
    readonly filtersShown: boolean;
}

export function StatusLine({ state, notices, filtered, filtersShown }: StatusLineProps): ReactElement {
    const [top, ...rest] = notices;

    return (
        <Box flexShrink={0} justifyContent="space-between" paddingX={1}>
            <Box flexShrink={1} overflow="hidden">
                <Text wrap="truncate">
                    <BrandStatus state={state} />
                    {top?.summary ? <Text dimColor> · </Text> : null}
                    {top?.summary ? <Text color={ui.warn}>{top.summary}</Text> : null}
                    {rest.length > 0 ? <Text dimColor> · +{rest.length}</Text> : null}
                    {filtered ? <Text dimColor> · filtered</Text> : null}
                </Text>
            </Box>
            <PendingKey top={top} filtersShown={filtersShown} />
        </Box>
    );
}

export function BrandStatus({ state }: { readonly state: DevState }): ReactElement {
    return (
        <>
            <Banner version={null} /> <StatusBadge phase={state.phase} glyph="live" animate={state.idleAnimation} />
        </>
    );
}

// flexShrink 0 and the margin keep the key readable against a summary that fills the row
export function KeySlot({ children }: { readonly children: ReactNode }): ReactElement {
    return (
        <Box flexShrink={0} marginLeft={2}>
            {children}
        </Box>
    );
}

interface PendingKeyProps {
    readonly top: Notice | undefined;
    readonly filtersShown: boolean;
}

export function PendingKey({ top, filtersShown }: PendingKeyProps): ReactElement {
    return (
        <KeySlot>
            {top ? (
                <Text bold color={ui.accent}>
                    {top.action}
                </Text>
            ) : (
                <FiltersKey shown={filtersShown} />
            )}
        </KeySlot>
    );
}
