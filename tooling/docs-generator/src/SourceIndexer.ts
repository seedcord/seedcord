import path from 'node:path';

import * as ts from 'typescript';

import { RuntimeBuild } from './RuntimeBuild';

import type { PackageSourceIndex, ReexportEntry, SourceEntry, SourceScan } from './types';

interface RuntimeSourceEntry {
    condition: string;
    entry: string; // relative to packageDir
}

interface SourceIndexOptions {
    packageDir: string;
    repoRoot: string; // recorded source paths are relative to it
    githubBase: string; // empty leaves the github urls out
    ref: string;
    // relative to packageDir. its directory is the source root. defaults to `src/index.ts`
    entry?: string;
    runtimeEntries?: readonly RuntimeSourceEntry[];
    // workspace dir (`logger`) to npm name (`@seedcord/logger`), for re-export owners
    packageNames?: Record<string, string>;
}

type TypeContainer = ts.ClassDeclaration | ts.InterfaceDeclaration | ts.EnumDeclaration;

const toPosix = (filePath: string): string => filePath.split(path.sep).join('/');

const joinName = (prefix: string, name: string): string => (prefix ? `${prefix}.${name}` : name);

// api extractor records a declaration's source as a path into the dist rollup and drops the line.
// this walks the package's `src` with the compiler API and keys each position the way the adapter
// keys a node, `Class.member`.
export class SourceIndexer {
    private readonly program: ts.Program;
    private readonly checker: ts.TypeChecker;
    private readonly entry: string;
    // TS normalizes every SourceFile.fileName to forward slashes. srcDir is posix to match.
    private readonly srcDir: string;
    private readonly index: PackageSourceIndex = {};
    private readonly reexports: ReexportEntry[] = [];
    private readonly seenReexport = new Set<string>();
    private readonly ownVersions: Record<string, string[]> = {};

    private constructor(private readonly options: SourceIndexOptions) {
        this.program = createProgram(options.packageDir);
        this.checker = this.program.getTypeChecker();
        this.entry = options.entry ?? 'src/index.ts';
        this.srcDir = `${toPosix(path.dirname(this.entryPath(this.entry)))}/`;
    }

    static scan(options: SourceIndexOptions): SourceScan {
        return new SourceIndexer(options).run();
    }

    private run(): SourceScan {
        const walked = new Set<ts.Symbol>();
        for (const exported of this.exportsOf(this.entry)) this.visit(exported, '', RuntimeBuild.default, walked);

        // the pass over forgotten declarations skips every name the symbol walk recorded
        const exportedKeys = new Set(Object.keys(this.index));
        this.recordForgottenExports(exportedKeys);

        for (const { condition, entry } of this.options.runtimeEntries ?? []) {
            const build = new RuntimeBuild(condition);
            const own = this.exportsOf(entry).filter(
                (exported) => exportedKeys.has(exported.getName()) && !walked.has(this.resolve(exported))
            );
            for (const exported of own) this.visit(exported, '', build, new Set());
            this.ownVersions[condition] = own.map((exported) => exported.getName());
        }

        return { sources: this.index, reexports: this.reexports, ownVersions: this.ownVersions };
    }

    private entryPath(entry: string): string {
        return path.join(this.options.packageDir, entry);
    }

    private exportsOf(entry: string): ts.Symbol[] {
        const sourceFile = this.program.getSourceFile(this.entryPath(entry));
        const moduleSymbol = sourceFile ? this.checker.getSymbolAtLocation(sourceFile) : undefined;
        return moduleSymbol ? this.checker.getExportsOfModule(moduleSymbol) : [];
    }

    private resolve(symbol: ts.Symbol): ts.Symbol {
        return symbol.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(symbol) : symbol;
    }

    private visit(symbol: ts.Symbol, prefix: string, build: RuntimeBuild, walked: Set<ts.Symbol>): void {
        const resolved = this.resolve(symbol);
        // the exported name is the key. `export { x as y }` belongs under `y`.
        const name = symbol.getName();
        const qualifiedName = joinName(prefix, name);
        this.recordDeclarations(build.withCondition(qualifiedName), resolved.getDeclarations() ?? []);
        if (prefix === '') this.recordReexport(name, resolved.getDeclarations() ?? []);

        // two aliases of one target each get a row above. this only stops the second walk into members.
        if (walked.has(resolved)) return;
        walked.add(resolved);
        for (const table of [resolved.members, resolved.exports]) {
            table?.forEach((member, key) => {
                const keyName = String(key);
                // TS calls the constructor symbol `__constructor`. The adapter keys it `Owner.constructor`.
                if (keyName === '__constructor') {
                    const constructorKey = build.withCondition(`${qualifiedName}.constructor`);
                    this.recordDeclarations(constructorKey, member.getDeclarations() ?? []);
                } else if (!keyName.startsWith('__')) this.visit(member, qualifiedName, build, walked);
            });
        }
    }

    // A top-level export with no declaration under this `src` came from another `packages/<x>/`.
    // API Extractor omits those without bundling, so record the declaring package and let the
    // umbrella overview list them.
    private recordReexport(name: string, decls: readonly ts.Declaration[]): void {
        const owner = this.foreignOwner(decls);
        if (!owner || this.seenReexport.has(name)) return;
        this.seenReexport.add(name);
        this.reexports.push({ name, owner });
    }

    private foreignOwner(decls: readonly ts.Declaration[]): string | undefined {
        if (decls.some((decl) => this.isOwnSource(decl.getSourceFile()))) return undefined;
        const ownSegment = path.basename(this.options.packageDir);
        for (const decl of decls) {
            const rel = toPosix(path.relative(this.options.repoRoot, decl.getSourceFile().fileName));
            const segment = /^packages\/([^/]+)\//.exec(rel)?.[1];
            if (segment && segment !== ownSegment) return this.options.packageNames?.[segment];
        }
        return undefined;
    }

    private isOwnSource(sourceFile: ts.SourceFile): boolean {
        return toPosix(sourceFile.fileName).startsWith(this.srcDir);
    }

    // The body-bearing declaration of an overloaded callable is the implementation, which API
    // Extractor leaves out of its overload list.
    private recordDeclarations(key: string, decls: readonly ts.Declaration[]): void {
        const documented = decls.length > 1 ? decls.filter((decl) => !isOverloadImplementation(decl)) : decls;
        for (const decl of documented) this.record(key, decl);
    }

    private record(key: string, decl: ts.Declaration): void {
        const sourceFile = decl.getSourceFile();
        if (!this.isOwnSource(sourceFile)) return;
        const target = ts.getNameOfDeclaration(decl) ?? decl;
        const pos = sourceFile.getLineAndCharacterOfPosition(target.getStart(sourceFile));
        const line = pos.line + 1;
        const column = pos.character + 1;
        const file = toPosix(path.relative(this.options.repoRoot, sourceFile.fileName));
        const entryValue: SourceEntry = { file, line, column };
        const { githubBase, ref } = this.options;
        if (githubBase) entryValue.url = `${githubBase}/blob/${ref}/${file}#L${line}C${column}`;
        (this.index[key] ??= []).push(entryValue);
    }

    // Forgotten exports are non-exported declarations API Extractor still documents. They never show up
    // in getExportsOfModule.
    private recordForgottenExports(exportedKeys: ReadonlySet<string>): void {
        for (const sourceFile of this.program.getSourceFiles()) {
            if (!this.isOwnSource(sourceFile)) continue;
            for (const statement of sourceFile.statements) this.walkStatement(statement, '', exportedKeys);
        }
    }

    private walkStatement(node: ts.Node, prefix: string, exportedKeys: ReadonlySet<string>): void {
        if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node)) {
            this.recordContainer(node, prefix, exportedKeys);
        } else if (ts.isVariableStatement(node)) {
            for (const decl of node.declarationList.declarations) {
                if (ts.isIdentifier(decl.name))
                    this.recordIfMissing(joinName(prefix, decl.name.text), decl, exportedKeys);
            }
        } else if (ts.isModuleDeclaration(node) && node.body && ts.isModuleBlock(node.body)) {
            const qualifiedName = joinName(prefix, node.name.getText());
            for (const statement of node.body.statements) this.walkStatement(statement, qualifiedName, exportedKeys);
        } else if ((ts.isFunctionDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) {
            this.recordIfMissing(joinName(prefix, node.name.text), node, exportedKeys);
        }
    }

    private recordContainer(node: TypeContainer, prefix: string, exportedKeys: ReadonlySet<string>): void {
        if (!node.name) return;
        const qualifiedName = joinName(prefix, node.name.text);
        // the symbol walk already recorded the exported class. a second one under that name is another build's.
        if (exportedKeys.has(qualifiedName)) return;
        this.record(qualifiedName, node);
        for (const member of node.members) {
            if (ts.isConstructorDeclaration(member))
                this.recordIfMissing(`${qualifiedName}.constructor`, member, exportedKeys);
            else if (member.name && ts.isIdentifier(member.name))
                this.recordIfMissing(`${qualifiedName}.${member.name.text}`, member, exportedKeys);
        }
    }

    private recordIfMissing(qualifiedName: string, decl: ts.Declaration, exportedKeys: ReadonlySet<string>): void {
        if (!exportedKeys.has(qualifiedName)) this.record(qualifiedName, decl);
    }
}

function isOverloadImplementation(decl: ts.Declaration): boolean {
    return (
        (ts.isFunctionDeclaration(decl) || ts.isMethodDeclaration(decl) || ts.isConstructorDeclaration(decl)) &&
        decl.body !== undefined
    );
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
