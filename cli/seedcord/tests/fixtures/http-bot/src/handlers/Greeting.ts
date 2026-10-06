import { resolve } from 'node:path';

import { HANDLERS_LOADED } from '#lib/markers';
import { readTextFiles } from '@seedcord/utils/node';

for await (const { text } of readTextFiles(resolve(import.meta.dirname, '../locales'))) {
    console.log(`fixture:text ${text.trim()}`);
}

console.log('fixture:literal import.meta.dirname stays text');
console.log(HANDLERS_LOADED);
