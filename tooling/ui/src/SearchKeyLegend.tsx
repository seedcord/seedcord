import { Cap, keyCap } from './KeyCap';
import { cn } from './lib/cn';

import type { KeyCap } from './KeyCap';
import type { ReactElement } from 'react';

interface KeyHint {
    keys: readonly KeyCap[];
    action: string;
}

const ROW_HINTS: readonly KeyHint[] = [
    { keys: [keyCap('ArrowUp'), keyCap('ArrowDown')], action: 'move' },
    { keys: [keyCap('Enter')], action: 'open' }
];
const GROUP_HINTS: readonly KeyHint[] = [...ROW_HINTS, { keys: [keyCap('Tab')], action: 'next group' }];

export function SearchKeyLegend({ hasGroups }: { hasGroups: boolean }): ReactElement {
    return (
        <ul className={cn('text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs')}>
            {(hasGroups ? GROUP_HINTS : ROW_HINTS).map(({ keys, action }) => (
                <li key={action} className={cn('flex items-center gap-1.5')}>
                    <span className={cn('flex items-center gap-1')}>
                        {keys.map((cap) => (
                            <Cap key={cap.label} cap={cap} />
                        ))}
                    </span>
                    {action}
                </li>
            ))}
        </ul>
    );
}
