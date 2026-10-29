import type { EvaluatedModule } from './ModuleLoader';

interface Export {
    readonly module: EvaluatedModule;
    readonly name: string;
}

export function isReferable(value: unknown): value is object {
    return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

// the module that defines each object or function the given modules export
export class ModuleExports {
    private readonly defining = new Map<unknown, Export>();

    constructor(modules: readonly EvaluatedModule[]) {
        const exports = modules
            .flatMap((module) => Object.entries(module.exports).map(([name, value]) => ({ module, name, value })))
            .filter(({ value }) => isReferable(value));

        for (const [value, listed] of Map.groupBy(exports, ({ value }) => value)) {
            // a barrel lists the value too. the defining module doesn't import any of the others
            const ids = new Set(listed.map(({ module }) => module.id));
            const defining = listed.find(({ module }) => module.imports.isDisjointFrom(ids)) ?? listed[0];
            if (defining) this.defining.set(value, defining);
        }
    }

    public definingExport(value: unknown): Export | undefined {
        return this.defining.get(value);
    }
}
