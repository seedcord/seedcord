import { ArrowDown, ArrowUp, CornerDownLeft } from 'lucide-react';

import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { cn } from './lib/cn';

import type { IconComponent } from './Icon';
import type { ReactElement } from 'react';

interface KeyCap {
    label: string;
    icon?: IconComponent;
}

interface KeyHint {
    keys: readonly KeyCap[];
    action: string;
}

const ROW_HINTS: readonly KeyHint[] = [
    {
        keys: [
            { label: 'Up', icon: ArrowUp },
            { label: 'Down', icon: ArrowDown }
        ],
        action: 'move'
    },
    { keys: [{ label: 'Enter', icon: CornerDownLeft }], action: 'open' }
];
const GROUP_HINTS: readonly KeyHint[] = [...ROW_HINTS, { keys: [{ label: 'Tab' }], action: 'next group' }];

function Cap({ label, icon }: KeyCap): ReactElement {
    if (icon === undefined) return <Kbd size="sm">{label}</Kbd>;
    return (
        <Kbd size="sm" aria-label={label}>
            <Icon icon={icon} size={10} />
        </Kbd>
    );
}

export function SearchKeyLegend({ hasGroups }: { hasGroups: boolean }): ReactElement {
    return (
        <ul className={cn('text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs')}>
            {(hasGroups ? GROUP_HINTS : ROW_HINTS).map(({ keys, action }) => (
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
