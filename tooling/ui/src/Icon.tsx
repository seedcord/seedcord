import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { GithubIcon } from './GithubIcon';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

const iconBaseClassName = tw`shrink-0 text-current`;

export type IconComponent = LucideIcon | typeof GithubIcon;

export interface IconProps {
    icon: IconComponent;
    size?: number;
    title?: string;
    className?: string;
}

export function Icon({ icon: IconComponent, size = 18, title, className }: IconProps): ReactElement {
    if (title) {
        return (
            <span role="img" aria-label={title} className={cn('inline-flex items-center justify-center', className)}>
                <IconComponent aria-hidden focusable="false" className={cn(iconBaseClassName)} size={size} />
            </span>
        );
    }
    return <IconComponent aria-hidden focusable="false" className={cn(iconBaseClassName, className)} size={size} />;
}
