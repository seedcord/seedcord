import { mkdir } from 'node:fs/promises';

import { extractPackageDocs } from './extractor';
import { writeManifest } from './manifest';
import { ApiDocsPaths } from './paths';
import { discoverWorkspacePackages } from './workspace';

import type { ApiDocsPathConfig } from './paths';
import type { PackageDocResult } from './types';

type ConsoleLike = Pick<Console, 'log'> & Partial<Pick<Console, 'error'>>;

export interface ApiDocsGeneratorOptions extends ApiDocsPathConfig {
    logger?: ConsoleLike;
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
        const packages = await discoverWorkspacePackages(this.paths);
        this.lastPackages = packages;
        return packages;
    }

    async run(): Promise<ApiDocsGeneratorResult> {
        await this.ensureOutputDirectory();
        const packageDirs = await this.discoverPackages();
        const results: PackageDocResult[] = [];

        for (const packageDir of packageDirs) {
            const result = await extractPackageDocs(packageDir, this.paths);
            if (!result) continue;

            results.push(result);
            this.logPackageResult(result);

            if (!result.succeeded) {
                throw new Error(`TypeDoc extraction failed for ${result.name}. see logs above.`);
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
        const outputSummary = result.outputPath ? `→ ${this.paths.toRepoRelative(result.outputPath)}` : '→ —';
        const warningSummary = result.warnings.length > 0 ? ` ⚠️ ${result.warnings.length}` : '';
        this.logger.log(`${statusIcon} ${result.name}@${result.version} ${outputSummary}${warningSummary}`);
    }
}
