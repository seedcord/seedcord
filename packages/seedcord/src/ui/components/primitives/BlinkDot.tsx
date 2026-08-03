import { Text, useAnimation } from 'ink';
import React from 'react';

import { ui } from '@ui/palette';

import type { ReactElement } from 'react';

const BLINK_MS = 530;

export function BlinkDot(): ReactElement {
    const { frame } = useAnimation({ interval: BLINK_MS });
    return <Text color={ui.bad}>{frame % 2 === 0 ? '●' : ' '}</Text>;
}
