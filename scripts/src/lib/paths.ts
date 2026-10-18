import path from 'node:path';

// the commit hook imports this before @seedcord/utils is built
export function posixRelative(from: string, to: string): string {
    return path.relative(from, to).split(path.sep).join('/');
}
