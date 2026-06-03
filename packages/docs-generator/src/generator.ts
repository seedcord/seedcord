import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { extractPackageApiModel } from './ae-extractor';
import { writeManifest } from './manifest';
import { ApiDocsPaths } from './paths';
import { buildSourceIndex } from './source-index';
import { discoverWorkspacePackages, readPackageManifest, unscopedName } from './workspace';

import type { ApiDocsPathConfig } from './paths';
import type { PackageDocResult } from './types';

type ConsoleLike = Pick<Console, 'log'> & Partial<Pick<Console, 'error'>>;

export interface ApiDocsGeneratorOptions extends ApiDocsPathConfig {
    logger?: ConsoleLike;
    /** Scope extraction to a single package, by full (`@seedcord/utils`) or unscoped (`utils`) name. */
    packageName?: string;
    /** GitHub repo base for source links, e.g. `https://github.com/seedcord/seedcord`. */
    githubBase?: string;
    /** Git ref the source links point at: the default branch locally, the tag for an archived version. */
    ref?: string;
}

export interface ApiDocsGeneratorResult {
    results: PackageDocResult[];
    outputDir: string;
    manifestPath: string;
    packages: string[];
    relativeOutputDir: string;
    relativeManifestPath: string;
}

export class ApiDocsGenerator {
    private readonly paths: ApiDocsPaths;
    private readonly logger: ConsoleLike;
    private readonly packageName?: string;
    private readonly githubBase?: string;
    private readonly ref: string;
    private lastResults: PackageDocResult[] = [];
    private lastPackages: string[] = [];

    constructor(options: ApiDocsGeneratorOptions = {}) {
        const pathConfig: ApiDocsPathConfig = {};
        if (options.packageRoot) pathConfig.packageRoot = options.packageRoot;
        if (options.repoRoot) pathConfig.repoRoot = options.repoRoot;
        if (options.packagesDir) pathConfig.packagesDir = options.packagesDir;
        if (options.outputDir) pathConfig.outputDir = options.outputDir;
        if (options.manifestPath) pathConfig.manifestPath = options.manifestPath;

        this.paths = new ApiDocsPaths(pathConfig);
        this.logger = options.logger ?? console;
        if (options.packageName) this.packageName = options.packageName;
        if (options.githubBase) this.githubBase = options.githubBase;
        this.ref = options.ref ?? 'next';
    }

    getPaths(): ApiDocsPaths {
        return this.paths;
    }

    getOutputDirectory(): string {
        return this.paths.outputDir;
    }

    getOutputDirectoryRelativeToRepo(): string {
        return this.paths.toRepoRelative(this.paths.outputDir);
    }

    getManifestPath(): string {
        return this.paths.manifestPath;
    }

    getManifestPathRelativeToRepo(): string {
        return this.paths.toRepoRelative(this.paths.manifestPath);
    }

    getPackagesDirectory(): string {
        return this.paths.packagesDir;
    }

    getPackagesDirectoryRelativeToRepo(): string {
        return this.paths.toRepoRelative(this.paths.packagesDir);
    }

    getLastResults(): PackageDocResult[] {
        return [...this.lastResults];
    }

    getLastDiscoveredPackages(): string[] {
        return [...this.lastPackages];
    }

    async ensureOutputDirectory(): Promise<string> {
        await mkdir(this.paths.outputDir, { recursive: true });
        return this.paths.outputDir;
    }

    async discoverPackages(): Promise<string[]> {
        const discovered = await discoverWorkspacePackages(this.paths);
        const packages = this.packageName ? await this.scopeToPackage(discovered, this.packageName) : discovered;
        this.lastPackages = packages;
        return packages;
    }

    private async scopeToPackage(packageDirs: string[], target: string): Promise<string[]> {
        const named = await Promise.all(
            packageDirs.map(async (dir) => ({ dir, name: (await readPackageManifest(dir)).name }))
        );
        const matches = named
            .filter(({ name }) => name === target || unscopedName(name) === target)
            .map(({ dir }) => dir);
        if (matches.length === 0) {
            throw new Error(`--package "${target}" matched no package under ${this.paths.packagesDir}`);
        }
        return matches;
    }

    private async buildPackageNames(): Promise<Record<string, string>> {
        const dirs = await discoverWorkspacePackages(this.paths);
        const names: Record<string, string> = {};
        for (const dir of dirs) names[path.basename(dir)] = (await readPackageManifest(dir)).name;
        return names;
    }

    async run(): Promise<ApiDocsGeneratorResult> {
        await this.ensureOutputDirectory();
        const packageDirs = await this.discoverPackages();
        // Built from every workspace package (not just the scoped ones) so a re-export's declaring
        // package always resolves to its real npm name even under `--package`.
        const packageNames = await this.buildPackageNames();
        const results: PackageDocResult[] = [];

        for (const packageDir of packageDirs) {
            const result = await extractPackageApiModel(packageDir, this.paths);
            if (!result) continue;

            results.push(result);
            this.logPackageResult(result);

            if (!result.succeeded) {
                throw new Error(`API Extractor extraction failed for ${result.name}. see logs above.`);
            }

            const scan = buildSourceIndex({
                packageDir,
                repoRoot: this.paths.repoRoot,
                githubBase: this.githubBase ?? '',
                ref: this.ref,
                packageNames,
                ...(result.sourceEntry ? { entry: result.sourceEntry } : {})
            });
            result.sources = scan.sources;
            if (scan.reexports.length > 0) result.reexports = scan.reexports;
        }

        await writeManifest(
            results,
            this.paths,
            this.githubBase ? { url: this.githubBase, branch: this.ref } : undefined
        );
        this.lastResults = results;

        this.logger.log(
            `\nGenerated ${results.length} API documents → ${this.paths.toRepoRelative(this.paths.outputDir)}`
        );

        return {
            results,
            outputDir: this.paths.outputDir,
            manifestPath: this.paths.manifestPath,
            packages: [...packageDirs],
            relativeOutputDir: this.paths.toRepoRelative(this.paths.outputDir),
            relativeManifestPath: this.paths.toRepoRelative(this.paths.manifestPath)
        };
    }

    private logPackageResult(result: PackageDocResult): void {
        const statusIcon = result.succeeded ? '✅' : '❌';
        const outputSummary = result.outputPath ? `-> ${this.paths.toRepoRelative(result.outputPath)}` : '-> (none)';
        const warningSummary = result.warnings.length > 0 ? ` ⚠️ ${result.warnings.length}` : '';
        this.logger.log(`${statusIcon} ${result.name}@${result.version} ${outputSummary}${warningSummary}`);
    }
}
