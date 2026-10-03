import { DocKind } from '#model/kinds';

import type { DocFlags } from '#src/types';

// typescript rejects any other order
export function memberModifiers(flags: DocFlags, kind: number): string[] {
    const modifiers: string[] = [];
    if (flags.access) modifiers.push(flags.access);
    if (flags.isStatic) modifiers.push('static');
    if (flags.isAbstract) modifiers.push('abstract');
    if (flags.isOverwriting) modifiers.push('override');
    // `const` already says readonly
    if (flags.isReadonly && kind !== DocKind.Variable) modifiers.push('readonly');
    if (flags.accessor === 'auto-accessor') modifiers.push('accessor');
    if (flags.isAsync) modifiers.push('async');
    return modifiers;
}
