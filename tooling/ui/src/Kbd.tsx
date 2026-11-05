import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { HTMLAttributes, ReactElement } from 'react';

const kbdBaseClassName = tw`inline-flex items-center border border-(--border) font-sans leading-none text-(--text-muted)`;

const kbdSizeClasses = {
    md: tw`h-6 min-w-6 justify-center rounded-md bg-(--surface-moderate) px-2 text-xs font-semibold tracking-wide`,
    sm: tw`h-5 min-w-5 justify-center rounded-sm bg-(--surface-subtle) px-1 text-[0.65rem]`
} as const;

export type KbdSize = keyof typeof kbdSizeClasses;

export interface KbdProps extends HTMLAttributes<HTMLElement> {
    size?: KbdSize;
}

export function Kbd({ size = 'md', className, ...props }: KbdProps): ReactElement {
    return <kbd {...props} className={cn(kbdBaseClassName, kbdSizeClasses[size], className)} />;
}
