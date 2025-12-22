'use client';
import { MOBILE_MAX_HEIGHT } from './constants';

import type { SidebarVariant } from '../types';
import type { CSSProperties } from 'react';

export function getListStyles(variant: SidebarVariant | undefined): CSSProperties | undefined {
    if (variant === 'desktop') {
        return {
            height: '100%',
            maxHeight: '100%',
            WebkitOverflowScrolling: 'touch'
        } satisfies CSSProperties;
    }

    return {
        maxHeight: MOBILE_MAX_HEIGHT,
        WebkitOverflowScrolling: 'touch'
    } satisfies CSSProperties;
}
