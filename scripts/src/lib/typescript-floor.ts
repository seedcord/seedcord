import { parse } from 'yaml';

export function lowestTypescript(workspaceYaml: string, catalog: string): string {
    // justified: pnpm-workspace.yaml keeps catalogs as name to version maps
    const parsed = parse(workspaceYaml) as { catalogs?: Record<string, Record<string, string>> } | null;
    const version = parsed?.catalogs?.[catalog]?.typescript?.match(/\d+\.\d+\.\d+/)?.[0];
    if (version === undefined) throw new Error(`pnpm-workspace.yaml's ${catalog} catalog has no typescript range`);
    return version;
}
