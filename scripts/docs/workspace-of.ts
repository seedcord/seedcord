import type { PackageSourceIndex } from '@seedcord/docs-engine';

// manifest source files are relative to the repo root
export function workspaceOf(sources: PackageSourceIndex | undefined): string | undefined {
    return Object.values(sources ?? {})[0]?.[0]?.file.split('/')[0];
}
