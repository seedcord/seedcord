import cliSpinners from 'cli-spinners';
import { Text, useAnimation } from 'ink';
import React from 'react';

import type { SpinnerName } from 'cli-spinners';
import type { ReactElement } from 'react';

export function Spinner({ type }: { readonly type: SpinnerName }): ReactElement {
    const { frames, interval } = cliSpinners[type];
    const { frame } = useAnimation({ interval });
    return <Text>{frames[frame % frames.length]}</Text>;
}
