import { cn } from '@seedcord/ui';
import { MaterwelonGlyph } from '@seedcord/ui/MaterwelonGlyph';

import type { ReactNode } from 'react';

const FILLS = { flesh: 'var(--flesh)', seeds: 'var(--seed-dark)', rind: 'var(--rind)', cream: 'var(--cream)' };

export function Materwelon({ className }: { className?: string }): ReactNode {
    return <MaterwelonGlyph fills={FILLS} className={cn(className)} />;
}
