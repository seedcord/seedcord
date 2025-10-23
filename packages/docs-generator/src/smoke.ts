import path from 'node:path';

import { ApiDocsGenerator } from './generator';

import type { ApiDocsGeneratorOptions, ApiDocsGeneratorResult } from './generator';

const HELP_TEXT = `Usage: tsx smoke.ts [options]

Options:
    --output <dir>    Directory where generated JSON files will be written.
    --packages <dir>  Directory that contains the packages to extract documentation from.
    --repo <dir>      Repository root used to compute relative paths.
    --manifest <path> Custom manifest.json path to write inside the output directory.
    --help            Show this message and exit.
`;

interface SmokeOptions {
    outputDir?: string;
    packagesDir?: string;
    repoRoot?: string;
    manifestPath?: string;
}

const INITIAL_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : undefined;

const resolvePath = (value: string): string =>
    path.isAbsolute(value) ? path.normalize(value) : path.normalize(path.resolve(INITIAL_CWD ?? process.cwd(), value));

const FLAG_ALIASES: Record<string, string> = {
    '-o': '--output',
    '-p': '--packages',
    '-r': '--repo',
    '-m': '--manifest',
    '-h': '--help'
};

type FlagHandler = (value: string, options: SmokeOptions) => void;

const FLAG_HANDLERS = new Map<string, FlagHandler>([
    [
        '--output',
        (value, options) => {
            options.outputDir = resolvePath(value);
        }
    ],
    [
        '--packages',
        (value, options) => {
            options.packagesDir = resolvePath(value);
        }
    ],
    [
        '--repo',
        (value, options) => {
            options.repoRoot = resolvePath(value);
        }
    ],
    [
        '--manifest',
        (value, options) => {
            options.manifestPath = resolvePath(value);
        }
    ]
]);

const normalizeFlag = (flag: string): string => FLAG_ALIASES[flag] ?? flag;

const parseArgs = (args: string[]): SmokeOptions | null => {
    if (args.some((arg) => normalizeFlag(arg) === '--help')) {
        return null;
    }

    const options: SmokeOptions = {};

    for (let index = 0; index < args.length; index += 1) {
        const rawFlag = args[index];
        if (!rawFlag) {
            throw new Error('Unexpected end of arguments');
        }

        const flag = normalizeFlag(rawFlag);
        if (flag === '--help') {
            return null;
        }

        const handler = FLAG_HANDLERS.get(flag);
        if (!handler) {
            throw new Error(`Unknown argument: ${rawFlag}`);
        }

        const value = args[index + 1];
        if (!value || value.startsWith('-')) {
            throw new Error(`Missing value for ${rawFlag}`);
        }

        handler(value, options);
        index += 1;
    }

    return options;
};

const formatResultSummary = (result: ApiDocsGeneratorResult): string => {
    const succeeded = result.results.filter((res) => res.succeeded).length;
    const failed = result.results.length - succeeded;
    return `Generated ${result.results.length} package(s) → ${result.relativeOutputDir} (manifest: ${result.relativeManifestPath}). ${succeeded} succeeded, ${failed} failed.`;
};

const logPackageResult = (result: ApiDocsGeneratorResult['results'][number]): void => {
    const statusIcon = result.succeeded ? '✅' : '❌';
    const outputLabel = result.outputPath ?? '<none>';
    const summaryParts: string[] = [];

    if (result.warnings.length > 0) summaryParts.push(`warnings: ${result.warnings.length}`);
    if (result.errors.length > 0) summaryParts.push(`errors: ${result.errors.length}`);

    console.log(`${statusIcon} ${result.name}@${result.version}`);
    console.log(`   output: ${outputLabel}`);
    console.log(`   entry points: ${result.entryPoints.join(', ') || '<none>'}`);
    if (summaryParts.length > 0) {
        console.log(`   ${summaryParts.join(' | ')}`);
    }

    if (result.warnings.length > 0) {
        console.log('   first warnings:');
        result.warnings.slice(0, 5).forEach((warning) => console.log(`      • ${warning}`));
    }

    if (result.errors.length > 0) {
        console.log('   first errors:');
        result.errors.slice(0, 5).forEach((error) => console.log(`      • ${error}`));
    }
};

const createGeneratorOptions = (options: SmokeOptions): ApiDocsGeneratorOptions => {
    const generatorOptions: ApiDocsGeneratorOptions = {};
    if (options.outputDir) generatorOptions.outputDir = options.outputDir;
    if (options.packagesDir) generatorOptions.packagesDir = options.packagesDir;
    if (options.repoRoot) generatorOptions.repoRoot = options.repoRoot;
    if (options.manifestPath) generatorOptions.manifestPath = options.manifestPath;
    return generatorOptions;
};

const main = async (): Promise<void> => {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed === null) {
        console.log(HELP_TEXT);
        return;
    }

    const generatorOptions = createGeneratorOptions(parsed);
    const generator = new ApiDocsGenerator(generatorOptions);

    console.log('Running API docs extraction...');
    const result = await generator.run();

    console.log(`\n${formatResultSummary(result)}`);
    console.log(`Manifest path: ${result.relativeManifestPath}`);
    console.log(`Output directory: ${result.relativeOutputDir}`);

    if (result.packages.length === 0) {
        console.log('No packages discovered.');
        return;
    }

    if (result.results.length === 0) {
        console.log('No documentation artifacts were generated.');
        return;
    }

    console.log('\nPackage results:');
    result.results.forEach((packageResult) => logPackageResult(packageResult));
};

main().catch((error) => {
    console.error('\n❌ smoke.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
