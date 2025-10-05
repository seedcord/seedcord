import { existsSync } from 'node:fs';
import path from 'node:path';

const quoteFiles = (files) => files.map((file) => JSON.stringify(file)).join(' ');

const runPrettier = (files) => {
    const fileList = quoteFiles(files);
    return fileList ? [`prettier --ignore-unknown --write ${fileList}`] : [];
};

const findNearestConfig = (filePath) => {
    let currentDir = path.dirname(filePath);

    // traverse up the directory tree to find the nearest eslint.config.mjs
    while (true) {
        const candidate = path.join(currentDir, 'eslint.config.mjs');
        if (existsSync(candidate)) return candidate;

        const parent = path.dirname(currentDir);
        if (parent === currentDir) break;
        currentDir = parent;
    }

    return null;
};

const runEslint = (files) => {
    const byConfig = new Map();

    for (const file of files) {
        const configPath = findNearestConfig(file);
        const key = configPath ?? 'DEFAULT';

        if (!byConfig.has(key)) byConfig.set(key, []);
        byConfig.get(key).push(file);
    }

    const commands = [];

    for (const [configPath, groupedFiles] of byConfig.entries()) {
        const fileList = quoteFiles(groupedFiles);
        if (!fileList) continue;

        const configFlag = configPath === 'DEFAULT' ? '' : `--config ${JSON.stringify(configPath)}`;
        const command = ['eslint --max-warnings=0 --fix', configFlag, fileList].filter(Boolean).join(' ');
        commands.push(command);
    }

    return commands;
};

/**
 * @type {import('lint-staged').Configuration}
 */
const config = {
    '*': runPrettier,
    '*.{ts,tsx,js,jsx,cjs,mjs}': runEslint
};

export default config;
