import { MOBILE_MAX_HEIGHT } from './constants';

import type { SidebarVariant } from '../types';
import type { CSSProperties } from 'react';

export function getContainerStyles(variant: SidebarVariant | undefined): CSSProperties | undefined {
    if (variant === 'mobile') {
        return {
            maxHeight: MOBILE_MAX_HEIGHT
        } satisfies CSSProperties;
    }

    return {
        height: '100%',
        maxHeight: '100%'
    } satisfies CSSProperties;
}
