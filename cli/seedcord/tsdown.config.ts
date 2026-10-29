import { createTsdownConfig } from '@seedcord/tsdown-config';

export default createTsdownConfig({
    entry: ['src/index.ts', 'src/workerd.index.ts', 'src/cli.ts'],
    format: ['esm'],
    deps: { neverBundle: true, alwaysBundle: ['@seedcord/cli-prompts', /^@seedcord\/cli-templates/] }
});
