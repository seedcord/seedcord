import { cn } from './lib/cn';
import { MaterwelonGlyph } from './MaterwelonGlyph';

import type { ReactElement } from 'react';

const FILLS = {
    flesh: 'var(--accent-a)',
    seeds: 'var(--seed-dark)',
    rind: 'var(--accent-b)',
    cream: 'var(--cream)'
} as const;

export function Materwelon({ className }: { className?: string }): ReactElement {
    return <MaterwelonGlyph fills={FILLS} className={cn(className)} />;
}
