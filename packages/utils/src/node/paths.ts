import * as path from 'node:path';

// true for the folder itself too
export function isInside(folder: string, target: string): boolean {
    const relative = path.relative(folder, target);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
