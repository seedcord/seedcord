import { mkdir } from 'node:fs/promises';

import { extractPackageApiModel } from './ae-extractor';
import { writeManifest } from './manifest';
import { ApiDocsPaths } from './paths';
import { discoverWorkspacePackages, readPackageManifest, unscopedName } from './workspace';

import type { ApiDocsPathConfig } from './paths';
import type { PackageDocResult } from './types';

type ConsoleLike = Pick<Console, 'log'> & Partial<Pick<Console, 'error'>>;

export interface ApiDocsGeneratorOptions extends ApiDocsPathConfig {
    logger?: ConsoleLike;
    /** Scope extraction to a single package, by full (`@seedcord/utils`) or unscoped (`utils`) name. */
    packageName?: string;
    /** GitHub base URL for the source tree being extracted; sets view-source links (e.g. at a tag). */
    projectFolderUrl?: string;
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
    private readonly projectFolderUrl?: string;
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
        if (options.projectFolderUrl) this.projectFolderUrl = options.projectFolderUrl;
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

    async run(): Promise<ApiDocsGeneratorResult> {
        await this.ensureOutputDirectory();
        const packageDirs = await this.discoverPackages();
        const results: PackageDocResult[] = [];

        for (const packageDir of packageDirs) {
            const result = await extractPackageApiModel(packageDir, this.paths, this.projectFolderUrl);
            if (!result) continue;

            results.push(result);
            this.logPackageResult(result);

            if (!result.succeeded) {
                throw new Error(`API Extractor extraction failed for ${result.name}. see logs above.`);
            }
        }

        await writeManifest(results, this.paths);
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
