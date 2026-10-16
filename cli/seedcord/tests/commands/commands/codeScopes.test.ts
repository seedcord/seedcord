import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { describe, expect, it } from 'vitest';

import { loadCodeScopes } from '#commands/commands/codeScopes';
import { quietSteps } from '#core/output/quietSteps';
import { fakeProject } from '#tests/commands/commands/fakeBot';
import { silentLogger } from '#tests/silentLogger';

import type { ProjectOpener } from '#tests/commands/commands/fakeBot';

class Help extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('help').setDescription('Lists the commands');
    }
}
RegisterCommand()(Help);

function scopesOf(projectLoader: ProjectOpener): ReturnType<typeof loadCodeScopes> {
    return loadCodeScopes(quietSteps, { projectLoader, logger: silentLogger }, '');
}

function names(commands: { name: string }[] | undefined): string[] | undefined {
    return commands?.map(({ name }) => name);
}

describe('loadCodeScopes', () => {
    it('puts each command in the scope its decorator picks', async () => {
        const { scopes } = await scopesOf(await fakeProject());

        expect(names(scopes?.global)).toEqual(['ping']);
        expect(names(scopes?.guilds.get('111'))).toEqual(['config']);
    });

    it('sends a command with no scope to the configured guilds and leaves global unset', async () => {
        const { scopes } = await scopesOf(await fakeProject({ commands: [Help], guilds: ['111', '222'] }));

        expect(scopes?.global).toBeUndefined();
        expect([...(scopes?.guilds.keys() ?? [])]).toEqual(['111', '222']);
    });
});
