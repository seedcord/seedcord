import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { GLOBAL_ID } from '@seedcord/core/internal';
import { describe, expect, it } from 'vitest';

import { loadCodeScopes } from '#commands/commands/codeScopes';
import { quietSteps } from '#core/output/quietSteps';
import { fakeProject } from '#tests/commands/commands/fakeBot';

import type { ProjectOpener } from '#core/config/openProjectWithSteps';

class Help extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('help').setDescription('Lists the commands');
    }
}
RegisterCommand()(Help);

function scopesOf(projectLoader: ProjectOpener): ReturnType<typeof loadCodeScopes> {
    return loadCodeScopes(quietSteps, { projectLoader }, '');
}

function names(commands: readonly { name: string }[] | undefined): string[] | undefined {
    return commands?.map(({ name }) => name);
}

describe('loadCodeScopes', () => {
    it('puts each command in the scope its decorator picks', async () => {
        const { scopes } = await scopesOf(await fakeProject());

        expect(names(scopes?.get(GLOBAL_ID))).toEqual(['ping']);
        expect(names(scopes?.get('111'))).toEqual(['config']);
    });

    it('sends a command with no scope to the configured guilds and leaves global out', async () => {
        const { scopes } = await scopesOf(await fakeProject({ commands: [Help], guilds: ['111', '222'] }));

        expect([...(scopes?.keys() ?? [])]).toEqual(['111', '222']);
    });
});
