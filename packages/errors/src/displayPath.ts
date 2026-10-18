interface DisplayPathOptions {
    // without one, the working directory itself prints as ./
    prefix?: string;
}

// the edge build of this package can't import node:path
export function displayPath(rawPath: string, { prefix }: DisplayPathOptions = {}): string {
    const path = forwardSlashes(rawPath.length > 1 ? rawPath.replace(/[/\\]+$/, '') : rawPath);
    if (typeof process === 'undefined' || typeof process.cwd !== 'function') return path;

    const cwd = forwardSlashes(process.cwd());

    if (path === cwd) return prefix ?? './';
    return path.startsWith(`${cwd}/`) ? `${prefix ?? ''}${path.slice(cwd.length + 1)}` : path;
}

function forwardSlashes(path: string): string {
    return path.replaceAll('\\', '/');
}
