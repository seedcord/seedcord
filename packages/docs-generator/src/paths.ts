import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const srcDir = path.dirname(currentFile);

const DEFAULT_PACKAGE_ROOT = path.resolve(srcDir, '..');
const DEFAULT_REPO_ROOT = path.resolve(DEFAULT_PACKAGE_ROOT, '..', '..');
const DEFAULT_PACKAGES_DIR = path.join(DEFAULT_REPO_ROOT, 'packages');
const DEFAULT_OUTPUT_DIR = path.join(DEFAULT_PACKAGE_ROOT, 'generated');
const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : undefined;

const resolveWithBases = (input: string, bases: (string | undefined)[]): string => {
    if (path.isAbsolute(input)) {
        return path.normalize(input);
    }

    for (const base of bases) {
        if (!base) continue;
        return path.normalize(path.resolve(base, input));
    }

    return path.normalize(path.resolve(input));
};

export interface ApiDocsPathConfig {
    packageRoot?: string;
    repoRoot?: string;
    packagesDir?: string;
    outputDir?: string;
    manifestPath?: string;
}

export class ApiDocsPaths {
    readonly packageRoot: string;
    readonly repoRoot: string;
    readonly packagesDir: string;
    readonly outputDir: string;
    readonly manifestPath: string;

    constructor(config: ApiDocsPathConfig = {}) {
        this.packageRoot = config.packageRoot
            ? resolveWithBases(config.packageRoot, [INIT_CWD, DEFAULT_REPO_ROOT, process.cwd()])
            : DEFAULT_PACKAGE_ROOT;

        this.repoRoot = config.repoRoot
            ? resolveWithBases(config.repoRoot, [INIT_CWD, this.packageRoot, DEFAULT_REPO_ROOT, process.cwd()])
            : DEFAULT_REPO_ROOT;

        if (config.packagesDir) {
            this.packagesDir = resolveWithBases(config.packagesDir, [
                this.repoRoot,
                INIT_CWD,
                this.packageRoot,
                process.cwd()
            ]);
        } else if (config.repoRoot) {
            this.packagesDir = path.join(this.repoRoot, 'packages');
        } else {
            this.packagesDir = DEFAULT_PACKAGES_DIR;
        }
        this.outputDir = config.outputDir
            ? resolveWithBases(config.outputDir, [INIT_CWD, this.repoRoot, this.packageRoot, process.cwd()])
            : path.join(this.packageRoot, path.basename(DEFAULT_OUTPUT_DIR));
        this.manifestPath = config.manifestPath
            ? resolveWithBases(config.manifestPath, [
                  INIT_CWD,
                  this.outputDir,
                  this.repoRoot,
                  this.packageRoot,
                  process.cwd()
              ])
            : path.join(this.outputDir, 'manifest.json');
    }

    toRepoRelative(filePath: string): string {
        return path.relative(this.repoRoot, filePath).split(path.sep).join('/');
    }

    toPackageRelative(filePath: string): string {
        return path.relative(this.packageRoot, filePath).split(path.sep).join('/');
    }

    getOutputPathForPackage(unscopedName: string): string {
        return path.join(this.outputDir, `${unscopedName}.json`);
    }
}

export const defaultPaths = new ApiDocsPaths();
