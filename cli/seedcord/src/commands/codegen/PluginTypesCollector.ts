import { dirname, join, relative, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { splitPluginKey } from '@seedcord/core/internal';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { HostPluginKeys, type SeedcordInstance } from '@seedcord/types/internal';
import { asError, importSpecifier, isInside, isPlainObject } from '@seedcord/utils/internal';

import { readManifest } from '#core/modules/installedManifest';
import { isReferable, ModuleExports } from '#core/modules/ModuleExports';

import { compare, escapeLiteral, renderKey } from './renderAugmentation';

import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { PluginTypeTable } from './renderAugmentation';
import type { AbstractConstructor } from 'type-fest';

type CodegenModules = Pick<ModuleLoader, 'evaluated' | 'importPackage'>;

type PluginClass = AbstractConstructor<object> & { readonly id?: unknown };

interface CodegenPlugin {
    readonly constructor: PluginClass;
    codegen(): Promise<unknown>;
}

interface Entry {
    readonly Class: PluginClass;
    readonly key: string;
    data: unknown;
}

interface Found {
    readonly specifier: string;
    readonly name: string;
}

interface MergingAttachments {
    readonly id: string;
    readonly firstKey: string;
    readonly secondKey: string;
}

// calls codegen() on every attached plugin and writes each plugin id's data as type text
export class PluginTypesCollector {
    private readonly problems: Error[] = [];
    private readonly entries = new Map<string, Entry>();

    private constructor() {}

    public static async collect(
        instance: SeedcordInstance,
        modules: CodegenModules,
        root: string
    ): Promise<PluginTypeTable> {
        const collector = new PluginTypesCollector();
        for (const key of instance[HostPluginKeys]) await collector.add(key, codegenPluginAt(instance, key));

        // built after every codegen(), since codegen() imports the files it reads
        const index = await ExportIndex.create(modules, root, collector.classes(), collector.problems);
        const types = new Map(collector.entries.entries().map(([id, { data }]) => [id, index.render(data, id, '')]));
        throwSingleOrAggregate(collector.problems, SeedcordErrorCode.CliProblems);
        return types;
    }

    private async add(key: string, plugin: CodegenPlugin | undefined): Promise<void> {
        if (!plugin) return;
        const Class = plugin.constructor;
        if (typeof Class.id !== 'string' || Class.id.length === 0) {
            this.problems.push(new SeedcordTypeError(SeedcordErrorCode.CliPluginCodegenNoId, [Class.name, key]));
            return;
        }

        try {
            this.store(Class.id, { Class, key, data: await plugin.codegen() });
        } catch (caught) {
            this.problems.push(
                new SeedcordError(SeedcordErrorCode.CliPluginCodegenThrew, [Class.name, key, asError(caught).message], {
                    cause: caught
                })
            );
        }
    }

    private store(id: string, entry: Entry): void {
        const existing = this.entries.get(id);
        if (!existing) {
            this.entries.set(id, entry);
        } else if (existing.Class === entry.Class) {
            const attachments = { id, firstKey: existing.key, secondKey: entry.key };
            existing.data = this.merge(existing.data, entry.data, '', attachments);
        } else {
            const sources = [existing, entry].map(({ Class, key }) => `${paint.sky(Class.name)} at ${paint.sky(key)}`);
            const note = `A subclass inherits its parent's id, so give it its own ${paint.bold('static readonly id')}.`;
            this.problems.push(
                new SeedcordError(SeedcordErrorCode.CoreDuplicateName, ['plugin id', id, sources, note])
            );
        }
    }

    // stops at a cycle and leaves render to report it
    private merge(
        existing: unknown,
        incoming: unknown,
        path: string,
        attachments: MergingAttachments,
        above: ReadonlySet<object> = new Set()
    ): unknown {
        if (isPlainObject(existing) && isPlainObject(incoming)) {
            if (above.has(existing)) return existing;
            const inside = new Set(above).add(existing);
            const names = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
            return Object.fromEntries(
                names.values().map((name) => {
                    if (!Object.hasOwn(existing, name)) return [name, incoming[name]];
                    if (!Object.hasOwn(incoming, name)) return [name, existing[name]];
                    const at = joinPath(path, name);
                    return [name, this.merge(existing[name], incoming[name], at, attachments, inside)];
                })
            );
        }
        if (!isDeepStrictEqual(existing, incoming)) {
            const { id, firstKey, secondKey } = attachments;
            this.problems.push(
                new SeedcordError(SeedcordErrorCode.CliPluginCodegenConflict, [
                    id,
                    firstKey,
                    secondKey,
                    shownPath(path)
                ])
            );
        }
        return existing;
    }

    private classes(): PluginClass[] {
        return this.entries
            .values()
            .map(({ Class }) => Class)
            .toArray();
    }
}

// the import that reaches each value that codegen() returned
class ExportIndex {
    private constructor(
        private readonly root: string,
        private readonly project: ModuleExports,
        private readonly packages: ReadonlyMap<unknown, Found>,
        private readonly problems: Error[]
    ) {}

    public static async create(
        modules: CodegenModules,
        root: string,
        pluginClasses: readonly PluginClass[],
        problems: Error[]
    ): Promise<ExportIndex> {
        const evaluated = modules.evaluated();
        // vite writes module files with forward slashes on windows too
        const inProject = (file: string): boolean =>
            isInside(root, file) && !relative(root, file).split(sep).includes('node_modules');
        const project = new ModuleExports(evaluated.filter(({ file }) => inProject(file)));
        const installed = new ModuleExports(evaluated.filter(({ file }) => !inProject(file)));

        // a value from a plugin's own package is written as an import of the package name
        const packages = new Map<unknown, Found>();
        for (const Class of pluginClasses) {
            const home = installed.definingExport(Class)?.module.file;
            const name = home === undefined ? undefined : packageNameOf(home);
            if (name === undefined) continue;
            for (const [exportName, value] of Object.entries(await modules.importPackage(name))) {
                if (isReferable(value) && !packages.has(value))
                    packages.set(value, { specifier: name, name: exportName });
            }
        }
        return new ExportIndex(root, project, packages, problems);
    }

    public render(value: unknown, id: string, path: string, above: ReadonlySet<object> = new Set()): string {
        if (Array.isArray(value) || isPlainObject(value)) {
            if (above.has(value)) return this.unwritable(id, path, 'a reference back to itself');
            const inside = new Set(above).add(value);
            if (Array.isArray(value))
                return `[${value.map((item, i) => this.render(item, id, `${path}[${i}]`, inside)).join(', ')}]`;
            const parts = Object.keys(value)
                .toSorted(compare)
                .map((name) => `${renderKey(name)}: ${this.render(value[name], id, joinPath(path, name), inside)}`);
            return parts.length === 0 ? '{}' : `{ ${parts.join('; ')} }`;
        }

        const literal = literalOf(value);
        if (literal !== undefined) return literal;
        const found = this.importOf(value);
        if (found) return `(typeof import('${escapeLiteral(found.specifier)}'))['${escapeLiteral(found.name)}']`;
        return this.unwritable(id, path, describeValue(value));
    }

    private unwritable(id: string, path: string, shown: string): string {
        this.problems.push(
            new SeedcordTypeError(SeedcordErrorCode.CliPluginCodegenValue, [id, shownPath(path), shown])
        );
        return 'never';
    }

    private importOf(value: unknown): Found | undefined {
        const defining = this.project.definingExport(value);
        if (defining) return { specifier: importSpecifier(this.root, defining.module.file), name: defining.name };
        return this.packages.get(value);
    }
}

function codegenPluginAt(instance: SeedcordInstance, key: string): CodegenPlugin | undefined {
    const { head, leaf } = splitPluginKey(key);
    const top: unknown = Reflect.get(instance, head);
    const value: unknown = leaf === undefined || !isReferable(top) ? top : Reflect.get(top, leaf);
    return hasCodegen(value) ? value : undefined;
}

function hasCodegen(value: unknown): value is CodegenPlugin {
    return isReferable(value) && typeof Reflect.get(value, 'codegen') === 'function';
}

function literalOf(value: unknown): string | undefined {
    if (value === null) return 'null';
    if (typeof value === 'string') return `'${escapeLiteral(value)}'`;
    if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return String(value);
    return undefined;
}

function describeValue(value: unknown): string {
    if (typeof value === 'function') return `the function ${value.name || '(anonymous)'}`;
    if (isReferable(value)) {
        const Class: unknown = Reflect.get(value, 'constructor');
        return typeof Class === 'function' ? `a ${Class.name}` : 'an object with no class';
    }
    if (typeof value === 'bigint' || typeof value === 'symbol') return `a ${typeof value}`;
    return String(value);
}

// bun doesn't have findPackageJSON
function packageNameOf(file: string): string | undefined {
    for (let dir = dirname(file); dir !== dirname(dir); dir = dirname(dir)) {
        // a nested dist/package.json often holds only "type"
        const name = readManifest(join(dir, 'package.json'))?.name;
        if (typeof name === 'string') return name;
    }
    return undefined;
}

function joinPath(path: string, name: string): string {
    return path ? `${path}.${name}` : name;
}

function shownPath(path: string): string {
    return path || 'the top level';
}
