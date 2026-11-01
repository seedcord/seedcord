import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { cn } from './lib/cn';

import type { IconComponent } from './Icon';
import type { ReactElement } from 'react';

export interface KeyCap {
    label: string;
    icon?: IconComponent;
}

export interface KeyHint {
    keys: readonly KeyCap[];
    action: string;
}

function Cap({ label, icon }: KeyCap): ReactElement {
    if (icon === undefined) return <Kbd size="sm">{label}</Kbd>;
    return (
        <Kbd size="sm" aria-label={label}>
            <Icon icon={icon} size={10} />
        </Kbd>
    );
}

export function KeyLegend({ hints }: { hints: readonly KeyHint[] }): ReactElement {
    return (
        <ul className={cn('text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs')}>
            {hints.map(({ keys, action }) => (
                <li key={action} className={cn('flex items-center gap-1.5')}>
                    <span className={cn('flex items-center gap-1')}>
                        {keys.map((key) => (
                            <Cap key={key.label} {...key} />
                        ))}
                    </span>
                    {action}
                </li>
            ))}
        </ul>
    );
}
