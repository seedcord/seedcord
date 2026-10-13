import { basename, resolve } from 'node:path';

import { HANDLERS_LOADED } from '#lib/markers';
import { readTextFiles, traverseDirectory } from '@seedcord/utils/node';

for (const folder of ['../locales', '../logs']) {
    for await (const { text } of readTextFiles(resolve(import.meta.dirname, folder))) {
        console.log(`fixture:text ${text.trim()}`);
    }
}

for await (const { fullPath } of traverseDirectory(resolve(import.meta.dirname, '../lib'))) {
    console.log(`fixture:module ${basename(fullPath)}`);
}

console.log('fixture:literal import.meta.dirname stays text');
console.log(HANDLERS_LOADED);
