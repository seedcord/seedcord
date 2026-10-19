import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';

import { HANDLERS_LOADED } from '#lib/markers';
import { readFiles, traverseDirectory } from '@seedcord/http';

for (const folder of ['../locales', '../logs']) {
    for await (const { bytes } of readFiles(resolve(import.meta.dirname, folder))) {
        console.log(`fixture:text ${bytes.toString().trim()}`);
    }
}

for await (const { fullPath, bytes } of readFiles('./assets')) {
    console.log(`fixture:bytes ${basename(fullPath)} ${createHash('sha256').update(bytes).digest('hex')}`);
}

for await (const { fullPath } of traverseDirectory(resolve(import.meta.dirname, '../lib'))) {
    console.log(`fixture:module ${basename(fullPath)}`);
}

console.log('fixture:literal import.meta.dirname stays text');
console.log(HANDLERS_LOADED);
