import type { ModuleLoader } from '#core/modules/ModuleLoader';

// for a fake loader whose bot has no plugin with a codegen()
export const emptyModuleGraph: Pick<ModuleLoader, 'evaluated' | 'importPackage'> = {
    evaluated: () => [],
    importPackage: (name) => Promise.reject(new Error(`the fake loader has no package ${name}`))
};
