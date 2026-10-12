import * as path from 'node:path';

// the bot and the CLI both resolve a config folder through this
export function resolveFromRoot(root: string, folder: string): string {
    return path.resolve(root, folder);
}

// true for the folder itself too
export function isInside(folder: string, target: string): boolean {
    const relative = path.relative(folder, target);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
