import { writeFile } from 'node:fs/promises';

import { vi } from 'vite-plus/test';

// chokidar 3 to 5 emit ready before they watch nested folders when one of their paths is missing.
// vite passes it every env file for the mode, existing or not
// this IS fixed in chokidar's repo. but not released yet :(
export async function saveUntil(file: string, text: string, check: () => unknown): Promise<void> {
    await vi.waitFor(
        async () => {
            await writeFile(file, text);
            await check();
        },
        { timeout: 10_000, interval: 200 }
    );
}
