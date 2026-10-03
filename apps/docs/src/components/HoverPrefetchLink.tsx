'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { ComponentProps, ReactElement } from 'react';

type HoverPrefetchLinkProps = Omit<
    ComponentProps<typeof Link>,
    'prefetch' | 'onMouseEnter' | 'onTouchStart' | 'onFocus'
>;

// each link next prefetches costs three docs worker requests
export function HoverPrefetchLink(props: HoverPrefetchLinkProps): ReactElement {
    const [prefetchEnabled, setPrefetchEnabled] = useState(false);
    const enablePrefetch = (): void => setPrefetchEnabled(true);

    return (
        <Link
            {...props}
            prefetch={prefetchEnabled ? null : false}
            onMouseEnter={enablePrefetch}
            onTouchStart={enablePrefetch}
            onFocus={enablePrefetch}
        />
    );
}
