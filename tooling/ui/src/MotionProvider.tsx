'use client';

import { LazyMotion, MotionConfig, domMax } from 'motion/react';

import type { ReactElement, ReactNode } from 'react';

// layout animations ship only in domMax
export function MotionProvider({ children }: { children: ReactNode }): ReactElement {
    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domMax} strict>
                {children}
            </LazyMotion>
        </MotionConfig>
    );
}
