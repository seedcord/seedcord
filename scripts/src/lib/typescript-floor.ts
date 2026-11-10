import { parse } from 'yaml';

export function lowestTypescript(workspaceYaml: string, catalog: string): string {
    // justified: pnpm-workspace.yaml keeps catalogs as name to version maps
    const parsed = parse(workspaceYaml) as { catalogs?: Record<string, Record<string, string>> } | null;
    const version = parsed?.catalogs?.[catalog]?.typescript?.match(/\d+\.\d+\.\d+/)?.[0];
    if (version === undefined)
        throw new Error(`pnpm-workspace.yaml's ${catalog} catalog doesn't have a typescript range`);
    return version;
}

// tsc prints `path(line,col): error TS...`, or a bare `error TS...` for one without a file
const ERROR_FILE = /^(.+?)\(\d+,\d+\): error TS/;

export function errorsInside(errors: readonly string[], folders: readonly string[]): string[] {
    return errors.filter((line) => {
        const file = ERROR_FILE.exec(line)?.[1];
        return file === undefined || folders.some((folder) => file.startsWith(folder));
    });
}
