import { filterAsync } from 'es-toolkit';

import type { DevEnvironment, EnvironmentModuleNode, Plugin } from 'vite';

export class ModuleCode {
    // vite empties transformResult before hotUpdate. the mappings are kept
    // because a blank line shifts the lines in a stack trace
    private readonly lastBuilt = new Map<string, { code: string; mappings: string }>();

    public get transform(): NonNullable<Plugin['transform']> {
        const { lastBuilt } = this;
        return {
            order: 'post',
            handler(code, id) {
                lastBuilt.set(id, { code, mappings: this.getCombinedSourcemap().mappings });
            }
        };
    }

    // clears the cached code so the bot gets the file again even if you write it back unchanged. the bot unregistered its handlers on the delete
    public forget(modules: EnvironmentModuleNode[]): EnvironmentModuleNode[] {
        for (const { id } of modules) if (id !== null) this.lastBuilt.delete(id);
        return modules;
    }

    // a ?url import is just the file's path. editing the file doesn't change it
    public changed(environment: DevEnvironment, modules: EnvironmentModuleNode[]): Promise<EnvironmentModuleNode[]> {
        return filterAsync(modules, async ({ id, url }) => {
            if (id === null) return true;
            const before = this.lastBuilt.get(id);
            if (!before) return true;
            const transformed = await environment.transformRequest(url).then(
                () => true,
                () => false
            );
            // the bot unregisters a file that fails to transform
            // forgetting its code also makes a revert reach the bot
            if (!transformed) {
                this.lastBuilt.delete(id);
                return true;
            }
            const after = this.lastBuilt.get(id);
            return after?.code !== before.code || after.mappings !== before.mappings;
        });
    }
}
