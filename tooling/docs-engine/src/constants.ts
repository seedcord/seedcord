import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GENERATED_RELATIVE_PATH = '../../../tooling/docs-generator/generated';
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

export const MANIFEST_FILENAME = 'manifest.json';
export const DEFAULT_GENERATED_DIR = path.resolve(MODULE_DIR, GENERATED_RELATIVE_PATH);

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : undefined;

function resolveInputPath(input: string): string {
    if (path.isAbsolute(input)) {
        return path.normalize(input);
    }

    const base = INIT_CWD ?? process.cwd();
    return path.normalize(path.resolve(base, input));
}

export function resolveGeneratedDir(rootDir?: string): string {
    const envOverride = process.env.SEEDCORD_DOCS_DIR;
    if (typeof envOverride === 'string' && envOverride.trim().length > 0) {
        return resolveInputPath(envOverride.trim());
    }

    if (rootDir) {
        return resolveInputPath(rootDir);
    }

    return DEFAULT_GENERATED_DIR;
}

export function resolveManifestPath(rootDir?: string, manifestPath?: string): string {
    if (manifestPath) {
        return resolveInputPath(manifestPath);
    }

    return path.join(resolveGeneratedDir(rootDir), MANIFEST_FILENAME);
}

// The fetch path (index.json + project.json) is intentionally node:fs-free so it runs in build, ISR,
// and request contexts alike; only the local create() path above touches the filesystem
// (SEEDCORD_DOCS_DIR).
const DEFAULT_INDEX_URL = 'https://cdn.seedcord.org/index.json';

export function resolveIndexUrl(): string {
    const override = process.env.SEEDCORD_DOCS_INDEX_URL?.trim();
    return override && override.length > 0 ? override : DEFAULT_INDEX_URL;
}

/** The base for sibling `project.json` fetches: the index URL with a trailing `/index.json` removed. */
export function projectBaseFromIndexUrl(indexUrl: string): string {
    return indexUrl.replace(/\/index\.json$/, '');
}
