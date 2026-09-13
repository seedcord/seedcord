/* eslint-disable no-console -- CLI script */
import path from 'node:path';

import { ApiDocsGenerator } from '@seedcord/docs-generator';

import { CliFlags } from '#src/lib/CliFlags';

import type { ApiDocsGeneratorOptions, ApiDocsGeneratorResult } from '@seedcord/docs-generator';

const flags = new CliFlags('tsx extract-docs.ts [options]', {
    output: { type: 'string', short: 'o', describe: 'Directory where generated JSON files will be written.' },
    package: { type: 'string', describe: 'Extract only this package (e.g. @seedcord/utils or utils).' },
    'project-folder-url': { type: 'string', describe: 'GitHub repo base for source links.' },
    ref: { type: 'string', describe: 'Git ref the source links point at.' },
    repo: { type: 'string', short: 'r', describe: 'Repository root used to compute relative paths.' },
    manifest: { type: 'string', short: 'm', describe: 'Custom manifest.json path inside the output directory.' }
});

const INITIAL_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : undefined;

const resolvePath = (value: string): string =>
    path.isAbsolute(value) ? path.normalize(value) : path.normalize(path.resolve(INITIAL_CWD ?? process.cwd(), value));

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

const createGeneratorOptions = (argv: readonly string[]): ApiDocsGeneratorOptions => {
    const parsed = flags.parse(argv);
    const options: ApiDocsGeneratorOptions = {};

    if (parsed.output) options.outputDir = resolvePath(parsed.output);
    if (parsed.package) options.packageName = parsed.package;
    if (parsed['project-folder-url']) options.githubBase = parsed['project-folder-url'];
    if (parsed.ref) options.ref = parsed.ref;
    if (parsed.repo) options.repoRoot = resolvePath(parsed.repo);
    if (parsed.manifest) options.manifestPath = resolvePath(parsed.manifest);

    return options;
};

const main = async (): Promise<void> => {
    const argv = process.argv.slice(2);
    if (flags.wantsHelp(argv)) {
        console.log(flags.help());
        return;
    }

    const generator = new ApiDocsGenerator(createGeneratorOptions(argv));

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

main().catch((error: unknown) => {
    console.error('\n❌ extract-docs.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
