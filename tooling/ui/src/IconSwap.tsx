'use client';

import { AnimatePresence, m } from 'motion/react';

import { Icon } from './Icon';
import { cn } from './lib/cn';
import { easeOutStrong } from './lib/motion';

import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

const ICON_SWAP_DURATION_S = 0.14;

export interface IconSwapProps {
    active: boolean;
    idleIcon: LucideIcon;
    activeIcon: LucideIcon;
    size?: number;
    activeClassName?: string;
    className?: string;
}

export function IconSwap({
    active,
    idleIcon,
    activeIcon,
    size = 16,
    activeClassName,
    className
}: IconSwapProps): ReactElement {
    return (
        <span className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
            <AnimatePresence initial={false}>
                <m.span
                    key={active ? 'active' : 'idle'}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: ICON_SWAP_DURATION_S, ease: [...easeOutStrong] }}
                    // Color goes on the motion wrapper so the Icon inherits via text-current and
                    // the inner element's prop shape doesn't change between idle and active.
                    className={cn('absolute inset-0 inline-flex', active && activeClassName)}
                >
                    <Icon icon={active ? activeIcon : idleIcon} size={size} />
                </m.span>
            </AnimatePresence>
        </span>
    );
}
