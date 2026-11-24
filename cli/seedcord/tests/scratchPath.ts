import { join } from 'node:path';

// clean:scratch deletes this folder, and eslint and tsc skip it. a file in it resolves imports from this package
const SCRATCH = join(import.meta.dirname, 'temp');

export function scratchPath(name: string): string {
    return join(SCRATCH, name);
}
