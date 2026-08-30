import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Configuration } from 'lint-staged';

interface ConfigHit {
    configPath: string;
    rootDir: string;
}

function findNearestConfig(filePath: string, name: string): ConfigHit | null {
    let dir = path.dirname(filePath);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- break is inside
    while (true) {
        const candidate = path.join(dir, name);
        if (existsSync(candidate)) return { configPath: candidate, rootDir: dir };

        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    return null;
}

const quoteFiles = (files: readonly string[]): string => files.map((file) => JSON.stringify(file)).join(' ');

interface Group extends Partial<ConfigHit> {
    files: string[];
}

function groupByConfig(files: readonly string[], name: string): Map<string, Group> {
    const groups = new Map<string, Group>();

    for (const file of files) {
        const hit = findNearestConfig(file, name);
        const key = hit?.configPath ?? 'DEFAULT';
        if (!groups.has(key)) groups.set(key, { files: [], ...hit });
        groups.get(key)?.files.push(file);
    }

    return groups;
}

// lint-staged runs every command from the repo root
function scoped(rootDir: string | undefined, command: string): string {
    if (rootDir === undefined) return `pnpm exec ${command}`;

    const inner = `cd ${JSON.stringify(rootDir)} && pnpm exec ${command}`;
    return `sh -c ${JSON.stringify(inner)}`;
}

function runPrettier(files: readonly string[]): string[] {
    if (files.length === 0) return [];

    const commands: string[] = [];

    for (const info of groupByConfig(files, 'prettier.config.ts').values()) {
        const fileList = quoteFiles(info.files);
        if (!fileList) continue;

        const base = ['prettier', '--ignore-unknown', '--write'];
        if (info.configPath) base.push('--config', JSON.stringify(info.configPath));

        commands.push(scoped(info.rootDir, [...base, fileList].join(' ')));
    }

    return commands;
}

function runEslint(files: readonly string[]): string[] {
    const linted = files.filter((file) => !file.endsWith('.d.ts'));
    const commands: string[] = [];

    for (const [configPath, info] of groupByConfig(linted, 'eslint.config.ts')) {
        const { rootDir } = info;
        const scopedFiles = rootDir === undefined ? info.files : info.files.map((file) => path.relative(rootDir, file));
        const fileList = quoteFiles(scopedFiles);
        if (!fileList) continue;

        const scopedConfigPath =
            rootDir !== undefined && configPath !== 'DEFAULT' ? path.relative(rootDir, configPath) : configPath;
        const configFlag = scopedConfigPath === 'DEFAULT' ? '' : `--config ${JSON.stringify(scopedConfigPath)}`;
        const command = ['eslint --no-warn-ignored --max-warnings=0 --fix --cache', configFlag, fileList]
            .filter(Boolean)
            .join(' ');

        commands.push(scoped(rootDir, command));
    }

    return commands;
}

const config: Configuration = {
    '*': runPrettier,
    '*.{ts,tsx,js,jsx,cjs,mjs}': runEslint
};

export default config;
