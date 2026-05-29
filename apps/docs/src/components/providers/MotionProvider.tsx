'use client';

import { LazyMotion, MotionConfig, domMax } from 'motion/react';

import type { ReactElement, ReactNode } from 'react';

// SegmentedControl's gliding pill uses `layoutId`, and layout animations only ship in the max bundle.
function MotionProvider({ children }: { children: ReactNode }): ReactElement {
    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domMax} strict>
                {children}
            </LazyMotion>
        </MotionConfig>
    );
}

export default MotionProvider;
