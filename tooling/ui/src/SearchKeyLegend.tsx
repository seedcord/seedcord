import { ArrowDown, ArrowUp, CornerDownLeft } from 'lucide-react';

import { KeyLegend } from './KeyLegend';

import type { KeyHint } from './KeyLegend';
import type { ReactElement } from 'react';

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

export function SearchKeyLegend({ hasGroups }: { hasGroups: boolean }): ReactElement {
    return <KeyLegend hints={hasGroups ? GROUP_HINTS : ROW_HINTS} />;
}
