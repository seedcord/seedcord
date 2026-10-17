import { mkdir, mkdtempDisposable, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { onTestFinished } from 'vitest';

const CLI_NODE_MODULES = join(import.meta.dirname, '../node_modules');

// env is the source of the worker's env object, like "TOKEN: bindings.secret()"
export function cloudflareConfigSource(env = ''): string {
    return `import { bindings, defineConfig } from 'cf/config';

export default defineConfig(({ mode }) => ({
    worker: { name: 'edge-bot', compatibilityDate: '2026-08-04', env: { ${env} } }
}));
`;
}

interface EdgeFolder {
    dir: string;
    cloudflareConfig: string;
}

export async function linkPackages(dir: string, names: readonly string[]): Promise<void> {
    await mkdir(join(dir, 'node_modules'), { recursive: true });
    for (const name of names) await symlink(join(CLI_NODE_MODULES, name), join(dir, 'node_modules', name));
}

// the folder is in the os temp dir, where node finds a package only through the links linkPackages writes
export async function edgeFolder(
    config = cloudflareConfigSource(),
    links: readonly string[] = ['cf']
): Promise<EdgeFolder> {
    const tmp = await mkdtempDisposable(join(tmpdir(), 'seedcord-edge-'));
    onTestFinished(() => tmp.remove());
    const dir = tmp.path;
    await linkPackages(dir, links);
    const cloudflareConfig = join(dir, 'cloudflare.config.ts');
    await writeFile(cloudflareConfig, config);
    return { dir, cloudflareConfig };
}
