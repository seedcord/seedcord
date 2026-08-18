import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs';

import type { TwoslashTypesCache } from 'fumadocs-twoslash';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SALTED_PACKAGES = ['@seedcord/gateway', '@seedcord/core'];
const SALT_LENGTH = 12;

// the stock cache keys on the snippet text alone
function declarationSalt(): string {
    const hash = createHash('sha256');
    for (const name of SALTED_PACKAGES) {
        const dist = path.resolve(HERE, '../../node_modules', name, 'dist');
        try {
            const files = readdirSync(dist)
                .filter((file) => file.endsWith('.d.mts') || file.endsWith('.d.ts'))
                .sort();
            for (const file of files) hash.update(readFileSync(path.join(dist, file)));
        } catch {
            hash.update(`missing:${name}`);
        }
    }
    return hash.digest('hex').slice(0, SALT_LENGTH);
}

export function createSaltedTypesCache(): TwoslashTypesCache {
    const base = createFileSystemTypesCache();
    const prefix = `// seedcord-types:${declarationSalt()}\n`;
    return {
        ...base,
        read: (code) => base.read(prefix + code),
        write: (code, data) => base.write(prefix + code, data)
    };
}
