import { Text, useAnimation } from 'ink';
import React from 'react';

import { ui } from '#ui/palette';

import type { ReactElement } from 'react';

const BLINK_MS = 530;

export function BlinkDot({ animate = true }: { readonly animate?: boolean }): ReactElement {
    const { frame } = useAnimation({ interval: BLINK_MS, isActive: animate });
    const lit = !animate || frame % 2 === 0;

    return <Text color={ui.bad}>{lit ? '●' : ' '}</Text>;
}
