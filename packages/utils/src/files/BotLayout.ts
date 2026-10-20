import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { asError } from '#src/misc/asError';

import { isInside, posixRelative } from './paths';

// every path here is root-relative with a leading slash, like '/locales'. one beside a ./src root reads '/../logs'
export interface BotLayoutData {
    readonly root: string;
    // the folders from files in seedcord.config.ts
    readonly listed: readonly string[];
    // outDir and the logs folder
    readonly skippedFolders: readonly string[];
    // seedcord.config.ts. a script without a config has none
    readonly configFile?: string | undefined;
}

export interface BotEntry {
    path: string;
    isFolder: boolean;
}

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'];
const DECLARATION_EXTENSIONS = ['.d.ts', '.d.mts'];
const CODE_AND_MAP_EXTENSIONS = [...MODULE_EXTENSIONS, '.map'];
const SKIPPED_NAME_GLOBS = ['!**/node_modules/**', '!**/.*', '!**/.*/**'];
const PROJECT_FILE_NAMES = new Set([
    'package.json',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'bun.lock',
    'bun.lockb'
]);
const PROJECT_FILE_GLOBS = ['seedcord.config.*', 'tsconfig*.json', ...PROJECT_FILE_NAMES];

function isProjectFileName(name: string): boolean {
    if (PROJECT_FILE_NAMES.has(name)) return true;
    return name.startsWith('seedcord.config.') || (name.startsWith('tsconfig') && name.endsWith('.json'));
}

// the symbols tinyglobby's escapePath escapes in a posix path.
// i would use the dependency directly, but the edge bundle can't resolve tinyglobby's fs import
const GLOB_SYMBOLS = /[()[\]{}*?|]|[!+@](?=\()/g;

// a key of '/' is base itself
function globFolder(base: string, key: string): string {
    return (key === '/' ? base : `${base}${key}`).replaceAll(GLOB_SYMBOLS, String.raw`\$&`);
}

function endsWithAny(file: string, extensions: string[]): boolean {
    const name = path.basename(file);
    return extensions.some((extension) => name.endsWith(extension));
}

function isModulePath(file: string): boolean {
    return endsWithAny(file, MODULE_EXTENSIONS) && !endsWithAny(file, DECLARATION_EXTENSIONS);
}

function isSkippedName(name: string): boolean {
    return name.startsWith('.') || name === 'node_modules';
}

// the CLI writes this layout's data into the slot for seedcord dev and the built bot
export class BotLayout {
    public readonly root: string;
    public readonly configFile: string | undefined;
    private readonly data: Readonly<BotLayoutData>;
    private readonly listed: readonly string[];
    private readonly skippedFolders: readonly string[];

    public constructor({ root, listed, skippedFolders, configFile }: BotLayoutData) {
        this.root = path.resolve(root);
        this.data = Object.freeze({
            root: this.root,
            listed: [...listed],
            skippedFolders: [...skippedFolders],
            configFile
        });
        this.listed = this.data.listed.map((key) => this.pathOf(key));
        this.skippedFolders = this.data.skippedFolders.map((key) => this.pathOf(key));
        this.configFile = configFile === undefined ? undefined : this.pathOf(configFile);
    }

    // a script that reads an absolute folder without a config gets every file in it
    public static openAt(folder: string): BotLayout {
        return new BotLayout({ root: folder, listed: ['/'], skippedFolders: [] });
    }

    // the extension vite gives a file once it builds it
    public static builtExtension(file: string): string {
        return isModulePath(file) ? '.js' : `${path.extname(file)}.js`;
    }

    // a built bot reports each module by the path of the file it became
    public static builtPath(key: string): string {
        return key.slice(0, key.length - path.extname(key).length) + BotLayout.builtExtension(key);
    }

    // the shape vite gives import.meta.glob keys and root imports, relative to base with a leading slash
    public static keyUnder(base: string, file: string): string {
        return `/${posixRelative(base, file)}`;
    }

    public resolve(dir: string): string {
        return path.resolve(this.root, dir);
    }

    public keyOf(file: string): string {
        return BotLayout.keyUnder(this.root, file);
    }

    // vite also passes virtual ids like \0seedcord:entry here
    public holds(file: string): boolean {
        return path.isAbsolute(file) && isInside(this.root, file);
    }

    public isSkipped(file: string): boolean {
        if (this.skippedFolders.some((folder) => isInside(folder, file))) return true;
        if (this.isProjectFile(file)) return true;
        return this.holds(file) && path.relative(this.root, file).split(path.sep).some(isSkippedName);
    }

    // also true for one written after the layout was built
    public isProjectFile(file: string): boolean {
        return path.dirname(file) === this.configDir() && isProjectFileName(path.basename(file));
    }

    public bundleProblem(folder: string): SeedcordError | undefined {
        if (!this.holds(folder)) return new SeedcordError(SeedcordErrorCode.CorePathOutsideRoot, [folder, this.root]);
        if (this.isSkipped(folder)) return new SeedcordError(SeedcordErrorCode.CoreDirectorySkipped, [folder]);
        return undefined;
    }

    public assertBundled(folder: string): void {
        const problem = this.bundleProblem(folder);
        if (problem) throw problem;
    }

    public isListed(folder: string): boolean {
        return this.listed.some((listed) => isInside(listed, folder));
    }

    public isModule(file: string): boolean {
        return this.holds(file) && isModulePath(file) && !this.isSkipped(file);
    }

    public isListedFile(file: string): boolean {
        return this.isListed(file) && !endsWithAny(file, CODE_AND_MAP_EXTENSIONS) && !this.isSkipped(file);
    }

    public folderAt(dir: string): BotFolder {
        return new BotFolder(this.resolve(dir), this);
    }

    // sorted by path, the order importFiles loads them in
    public async modulesUnder(folder: string): Promise<string[]> {
        const entries = await Array.fromAsync(this.entriesUnder(folder));
        return entries
            .filter(({ path: file, isFolder }) => !isFolder && this.isModule(file))
            .map(({ path: file }) => file)
            .toSorted();
    }

    // never reads inside a skipped folder
    public async *entriesUnder(folder: string): AsyncGenerator<BotEntry> {
        const entries = await readdir(folder, { withFileTypes: true }).catch((error: unknown) => {
            throw new SeedcordError(SeedcordErrorCode.CorePathUnreadable, [folder, asError(error).message], {
                cause: error
            });
        });
        for (const entry of entries) {
            const entryPath = path.join(folder, entry.name);
            if (this.isSkipped(entryPath)) continue;
            if (entry.isDirectory()) {
                yield { path: entryPath, isFolder: true };
                yield* this.entriesUnder(entryPath);
            } else if (entry.isFile()) {
                yield { path: entryPath, isFolder: false };
            }
        }
    }

    // base is the folder import.meta.glob resolves the patterns against, relative to root
    public moduleGlobs(base = '.'): string[] {
        const folder = globFolder(base, '/');
        return [
            ...MODULE_EXTENSIONS.map((extension) => `${folder}/**/*${extension}`),
            ...DECLARATION_EXTENSIONS.map((extension) => `!${folder}/**/*${extension}`),
            ...this.globExcludes(base)
        ];
    }

    public listedFileGlobs(base = '.'): string[] {
        const folders = this.data.listed.map((key) => globFolder(base, key));
        return [
            ...folders.flatMap((folder) => [
                `${folder}/**/*`,
                ...CODE_AND_MAP_EXTENSIONS.map((extension) => `!${folder}/**/*${extension}`)
            ]),
            ...this.globExcludes(base)
        ];
    }

    public toJSON(): Readonly<BotLayoutData> {
        return this.data;
    }

    // a built bot resolves these against its own root, where a key like '/../dist' is the bot itself.
    // the built entry writes its own configFile, relative to outDir
    public bundledData(): BotLayoutData {
        const insideRoot = (keys: readonly string[]): string[] => keys.filter((key) => this.holds(this.pathOf(key)));
        return {
            root: this.root,
            listed: insideRoot(this.data.listed),
            skippedFolders: insideRoot(this.data.skippedFolders)
        };
    }

    private configDir(): string | undefined {
        return this.configFile === undefined ? undefined : path.dirname(this.configFile);
    }

    private globExcludes(base: string): string[] {
        const folders = this.bundledData().skippedFolders.map((key) => `!${globFolder(base, key)}/**`);
        const configDir = this.configDir();
        const projectFiles =
            configDir === undefined || !this.holds(configDir)
                ? []
                : PROJECT_FILE_GLOBS.map((name) => `!${globFolder(base, this.keyOf(configDir))}/${name}`);
        return [...SKIPPED_NAME_GLOBS, ...folders, ...projectFiles];
    }

    private pathOf(key: string): string {
        return path.resolve(this.root, `.${key}`);
    }
}

// one folder of the bot, like the handlers folder
export class BotFolder {
    public constructor(
        public readonly path: string,
        private readonly layout: BotLayout
    ) {}

    // whether importFiles on this folder imports the file
    public holdsModule(file: string): boolean {
        return isInside(this.path, file) && this.layout.isModule(file);
    }

    // a skipped file counts as outside the folder
    public holds(file: string): boolean {
        return isInside(this.path, file) && !this.layout.isSkipped(file);
    }
}
