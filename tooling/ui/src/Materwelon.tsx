import { cn } from './lib/cn';
import { MaterwelonGlyph } from './MaterwelonGlyph';

import type { ReactElement } from 'react';

const FILLS = {
    flesh: 'var(--flesh)',
    seeds: 'var(--seed-dark)',
    rind: 'var(--rind)',
    pith: 'var(--pith)'
} as const;

export function Materwelon({ className }: { className?: string }): ReactElement {
    return <MaterwelonGlyph fills={FILLS} className={cn(className)} />;
}
