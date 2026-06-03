import { Text, useAnimation } from 'ink';
import React from 'react';

import type { TextProps } from 'ink';
import type { ReactElement } from 'react';

// A slow rotating arc, distinct from ink-spinner's startup `balloon2`, so the running state looks different
// from the startup spinner.
const FRAMES = ['◜', '◠', '◝', '◞', '◡', '◟'] as const;
const FRAME_MS = 120;
const STATIC_GLYPH = '●';

interface RunningAnimationProps {
    readonly active: boolean;
    readonly color?: TextProps['color'];
}

export function RunningAnimation({ active, color }: RunningAnimationProps): ReactElement {
    const { frame } = useAnimation({ interval: FRAME_MS, isActive: active });
    const glyph = active ? FRAMES[frame % FRAMES.length] : STATIC_GLYPH;
    return color === undefined ? <Text>{glyph}</Text> : <Text color={color}>{glyph}</Text>;
}
