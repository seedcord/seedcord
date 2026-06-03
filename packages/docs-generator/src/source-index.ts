import path from 'node:path';

import * as ts from 'typescript';

import type { PackageSourceIndex, ReexportEntry, SourceEntry, SourceScan } from './types';

export interface SourceIndexOptions {
    /** Absolute path to the package directory (the one holding `tsconfig.json` + `src/`). */
    packageDir: string;
    /** Absolute repo root, used to make source paths repo-relative for the GitHub URL. */
    repoRoot: string;
    /** GitHub repo base, e.g. `https://github.com/seedcord/seedcord`. Empty disables URL building. */
    githubBase: string;
    /** Git ref used in the generated URLs: the default branch for local builds, the tag for an archive. */
    ref: string;
    /** Entry module relative to `packageDir`; its directory is the package's source root. Default `src/index.ts`. */
    entry?: string;
    /** Workspace dir segment (`services`) to npm name (`@seedcord/services`), for re-export owners. */
    packageNames?: Record<string, string>;
}

const toPosix = (filePath: string): string => filePath.split(path.sep).join('/');

/**
 * API Extractor records every declaration's source as a path into the bundled `dist/index.d.mts`
 * rollup and discards the line/column it computed. To recover exact `src/*.ts` line + column, walk
 * the package's own source with the TypeScript compiler API (the technique TypeDoc uses) and key the
 * positions by the same dotted qualified name the adapter builds from each node's path
 * (`Class.member`). Declarations outside this package's `src` (re-exported workspace symbols) are
 * skipped here; their position is recorded under the package that declares them.
 */
export function buildSourceIndex(options: SourceIndexOptions): SourceScan {
    const program = createProgram(options.packageDir);
    const checker = program.getTypeChecker();
    const entryPath = path.join(options.packageDir, options.entry ?? 'src/index.ts');
    // TS normalizes every SourceFile.fileName to forward slashes, so compare against a posix srcDir.
    const srcDir = `${toPosix(path.dirname(entryPath))}/`;
    const ownSegment = path.basename(options.packageDir);
    const index: PackageSourceIndex = {};
    const reexports: ReexportEntry[] = [];
    const seen = new Set<ts.Symbol>();
    const seenReexport = new Set<string>();

    // A top-level export whose every declaration is located in another `packages/<x>/` is re-exported,
    // not declared here; record its declaring package so the umbrella overview can list it (API
    // Extractor omits it without bundling).
    const foreignOwner = (decls: readonly ts.Declaration[]): string | undefined => {
        if (decls.some((decl) => toPosix(decl.getSourceFile().fileName).startsWith(srcDir))) return undefined;
        for (const decl of decls) {
            const rel = toPosix(path.relative(options.repoRoot, decl.getSourceFile().fileName));
            const segment = /^packages\/([^/]+)\//.exec(rel)?.[1];
            if (segment && segment !== ownSegment) return options.packageNames?.[segment];
        }
        return undefined;
    };

    const record = (qualifiedName: string, decl: ts.Declaration): void => {
        const sourceFile = decl.getSourceFile();
        if (!toPosix(sourceFile.fileName).startsWith(srcDir)) return;
        const target = ts.getNameOfDeclaration(decl) ?? decl;
        const pos = sourceFile.getLineAndCharacterOfPosition(target.getStart(sourceFile));
        const line = pos.line + 1;
        const column = pos.character + 1;
        const file = toPosix(path.relative(options.repoRoot, sourceFile.fileName));
        const entryValue: SourceEntry = { file, line, column };
        if (options.githubBase) entryValue.url = `${options.githubBase}/blob/${options.ref}/${file}#L${line}C${column}`;
        (index[qualifiedName] ??= []).push(entryValue);
    };

    // The body-bearing implementation of an overloaded callable is not a documented overload; for an
    // overloaded symbol drop it so the per-overload sources stay 1:1 with API Extractor's overload list.
    const recordDeclarations = (qualifiedName: string, decls: readonly ts.Declaration[]): void => {
        const documented = decls.length > 1 ? decls.filter((decl) => !isOverloadImplementation(decl)) : decls;
        for (const decl of documented) record(qualifiedName, decl);
    };

    const visit = (symbol: ts.Symbol, prefix: string): void => {
        const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
        // Key on the exported name, not the resolved name, so `export { x as y }` keys on `y`.
        const name = symbol.getName();
        const qualifiedName = prefix ? `${prefix}.${name}` : name;
        recordDeclarations(qualifiedName, resolved.getDeclarations() ?? []);

        if (prefix === '') {
            const owner = foreignOwner(resolved.getDeclarations() ?? []);
            if (owner && !seenReexport.has(name)) {
                seenReexport.add(name);
                reexports.push({ name, owner });
            }
        }

        // Positions for every export name are recorded above; `seen` only stops re-descending into the
        // same symbol's members, so two aliases of one target each keep their own top-level entry.
        if (seen.has(resolved)) return;
        seen.add(resolved);
        for (const table of [resolved.members, resolved.exports]) {
            table?.forEach((member, key) => {
                const keyName = String(key);
                // TS names the constructor symbol `__constructor`; the adapter keys it `Owner.constructor`.
                if (keyName === '__constructor')
                    recordDeclarations(`${qualifiedName}.constructor`, member.getDeclarations() ?? []);
                else if (!keyName.startsWith('__')) visit(member, qualifiedName);
            });
        }
    };

    const entry = program.getSourceFile(entryPath);
    const moduleSymbol = entry ? checker.getSymbolAtLocation(entry) : undefined;
    if (moduleSymbol) {
        for (const exported of checker.getExportsOfModule(moduleSymbol)) visit(exported, '');
    }

    // Snapshot the symbol-walk keys so the gap-fill adds forgotten declarations (including multiple
    // overloads of one name) without overwriting an exported symbol's already-recorded position.
    const exportedKeys = new Set(Object.keys(index));
    recordForgottenExports(program, srcDir, (qualifiedName) => exportedKeys.has(qualifiedName), record);

    return { sources: index, reexports };
}

function isOverloadImplementation(decl: ts.Declaration): boolean {
    return (
        (ts.isFunctionDeclaration(decl) || ts.isMethodDeclaration(decl) || ts.isConstructorDeclaration(decl)) &&
        decl.body !== undefined
    );
}

function join(prefix: string, name: string): string {
    return prefix ? `${prefix}.${name}` : name;
}

// Forgotten exports (non-exported declarations API Extractor still documents) never appear in
// getExportsOfModule; fill them from a raw declaration walk over the package's own source, keyed by
// declared name. Gap-fill only: skip names the symbol walk already recorded.
function recordForgottenExports(
    program: ts.Program,
    srcDir: string,
    has: (qualifiedName: string) => boolean,
    record: (qualifiedName: string, decl: ts.Declaration) => void
): void {
    const gapRecord = (qualifiedName: string, decl: ts.Declaration): void => {
        if (!has(qualifiedName)) record(qualifiedName, decl);
    };
    const recordMembers = (
        qualifiedName: string,
        members: readonly (ts.ClassElement | ts.TypeElement | ts.EnumMember)[]
    ): void => {
        for (const member of members) {
            if (ts.isConstructorDeclaration(member)) gapRecord(`${qualifiedName}.constructor`, member);
            else if (member.name && ts.isIdentifier(member.name))
                gapRecord(`${qualifiedName}.${member.name.text}`, member);
        }
    };
    const walkStatement = (node: ts.Node, prefix: string): void => {
        if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node)) {
            if (!node.name) return;
            const qualifiedName = join(prefix, node.name.text);
            gapRecord(qualifiedName, node);
            recordMembers(qualifiedName, node.members);
        } else if (ts.isVariableStatement(node)) {
            for (const decl of node.declarationList.declarations) {
                if (ts.isIdentifier(decl.name)) gapRecord(join(prefix, decl.name.text), decl);
            }
        } else if (ts.isModuleDeclaration(node) && node.body && ts.isModuleBlock(node.body)) {
            const qualifiedName = join(prefix, node.name.getText());
            for (const statement of node.body.statements) walkStatement(statement, qualifiedName);
        } else if ((ts.isFunctionDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) {
            gapRecord(join(prefix, node.name.text), node);
        }
    };
    for (const sourceFile of program.getSourceFiles()) {
        if (!toPosix(sourceFile.fileName).startsWith(srcDir)) continue;
        for (const statement of sourceFile.statements) walkStatement(statement, '');
    }
}

function createProgram(packageDir: string): ts.Program {
    const tsconfigPath = path.join(packageDir, 'tsconfig.json');
    const configFile = ts.readConfigFile(tsconfigPath, (filePath) => ts.sys.readFile(filePath));
    if (configFile.error) {
        throw new Error(
            `Cannot read ${tsconfigPath}: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')}`
        );
    }
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, packageDir);
    if (parsed.fileNames.length === 0) {
        throw new Error(`No source files resolved from ${tsconfigPath}; the source index would be empty.`);
    }
    return ts.createProgram(parsed.fileNames, parsed.options);
}
