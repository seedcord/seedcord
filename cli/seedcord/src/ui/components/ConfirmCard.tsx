import { Box, Text } from 'ink';
import React from 'react';

import { CONFIRMS, confirmKeyLabel } from '#ui/confirms';
import { ui } from '#ui/palette';

import type { Confirmable } from '#ui/confirms';
import type { ReactElement } from 'react';

export function ConfirmCard({ confirm }: { readonly confirm: Confirmable }): ReactElement {
    return (
        <Box borderStyle="round" borderColor={ui.warn} flexDirection="column" paddingX={1}>
            <Text color={ui.warn} bold>
                {CONFIRMS[confirm].title}
            </Text>
            <Text>
                press{' '}
                <Text color={ui.warn} bold>
                    {confirmKeyLabel(confirm)}
                </Text>{' '}
                again to {confirm}, or any other key to stay
            </Text>
        </Box>
    );
}
