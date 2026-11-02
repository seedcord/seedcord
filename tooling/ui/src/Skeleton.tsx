import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ReactElement } from 'react';

const skeletonToneClasses = {
    subtle: tw`bg-(--text)/6`,
    moderate: tw`bg-(--text)/10`
} as const;

export type SkeletonTone = keyof typeof skeletonToneClasses;

export interface SkeletonProps {
    tone?: SkeletonTone;
    className?: string;
}

export function Skeleton({ tone = 'subtle', className }: SkeletonProps): ReactElement {
    return <div aria-hidden className={cn('animate-pulse rounded', skeletonToneClasses[tone], className)} />;
}
