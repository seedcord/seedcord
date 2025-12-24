import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

async function run() {
    const here = dirname(fileURLToPath(import.meta.url));
    const distEntry = resolve(here, '../dist/cli.mjs');
    if (existsSync(distEntry)) {
        await import(pathToFileURL(distEntry).href);
        return;
    }

    const srcEntry = resolve(here, '../src/cli.ts');
    await import('tsx/esm/api');
    await import(pathToFileURL(srcEntry).href);
}

run().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
});
