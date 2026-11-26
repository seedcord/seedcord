import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { TestProject } from 'vite-plus/test/node';

// turbo stops a running test task when another task fails. when
// this happens, we gotta make sure its workers get to delete their
// fixture copies
export async function setup(project: TestProject): Promise<void> {
    await rm(join(project.config.root, 'tests', 'temp'), { recursive: true, force: true });
}
