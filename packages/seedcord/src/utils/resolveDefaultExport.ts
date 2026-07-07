export function resolveDefaultExport<TValue>(moduleExport: TValue): unknown {
    let current: unknown = moduleExport;
    const visited = new Set<unknown>();

    while (isObjectWithDefault(current) && !visited.has(current)) {
        visited.add(current);
        current = current.default;
    }

    return current;
}

function isObjectWithDefault(value: unknown): value is { default: unknown } {
    return Boolean(value && typeof value === 'object' && 'default' in value);
}
