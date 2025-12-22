'use client';

import { cn } from '@lib/utils';

import type { ReactElement } from 'react';

type IconComponentType = React.ComponentType<Record<string, unknown>>;

interface IconProps {
    icon: IconComponentType;
    size?: number;
    title?: string;
    className?: string;
}

function Icon({ icon: iconComponent, size = 18, title, className }: IconProps): ReactElement {
    const IconComponent: IconComponentType = iconComponent;

    if (title) {
        return (
            <span role="img" aria-label={title} className={cn('inline-flex items-center justify-center', className)}>
                <IconComponent aria-hidden focusable="false" className="text-current" size={size} />
            </span>
        );
    }

    return (
        <IconComponent aria-hidden focusable="false" className={cn('shrink-0 text-current', className)} size={size} />
    );
}

export default Icon;
