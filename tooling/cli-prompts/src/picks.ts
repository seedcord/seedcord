import type { Choice } from './Choice';

export function toggle<Value extends string>(picked: ReadonlySet<Value>, value: Value): ReadonlySet<Value> {
    const next = new Set(picked);
    if (!next.delete(value)) next.add(value);
    return next;
}

export function inListOrder<Value extends string>(
    choices: readonly Choice<Value>[],
    picked: ReadonlySet<Value>
): Value[] {
    return choices.flatMap((choice) => (picked.has(choice.value) ? [choice.value] : []));
}
