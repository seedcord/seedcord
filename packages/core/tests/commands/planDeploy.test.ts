import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { planDeploy } from '#src/commands/planDeploy';
import { GLOBAL_ID } from '#src/commands/scopes';

import type { CommandBody, CommandScopes } from '#src/commands/putCommands';
import type { ScopeId } from '#src/commands/scopes';
import type { DeployResult } from '#src/commands/types';
import type { APIApplicationCommand } from 'discord-api-types/v10';

const PING = { name: 'ping', description: 'Replies with Pong!' };
const CONFIG = { name: 'config', description: 'Config' };
const REPORT = { name: 'Report', type: ApplicationCommandType.User } as const;

function onDiscord(commands: readonly CommandBody[]): Map<string, APIApplicationCommand> {
    // justified: the plan reads only name and type
    return new Map(commands.map((c) => [c.name, { name: c.name, type: c.type ?? 1 } as APIApplicationCommand]));
}

// discord has the same commands as the code
function discordMatching(scopes: CommandScopes): (unchanged: ScopeId[]) => Promise<DeployResult> {
    return (unchanged) =>
        Promise.resolve(new Map(unchanged.map((scope) => [scope, onDiscord(scopes.get(scope) ?? [])])));
}

async function lastDeployOf(scopes: CommandScopes): Promise<Record<string, string>> {
    const { hashes } = await planDeploy(scopes, undefined, discordMatching(scopes));
    return hashes;
}

describe('planDeploy', () => {
    it('skips a scope whose commands load in another order', async () => {
        const last = await lastDeployOf(new Map([[GLOBAL_ID, [PING, REPORT]]]));
        const reordered = new Map([[GLOBAL_ID, [REPORT, PING]]]);

        const plan = await planDeploy(reordered, last, discordMatching(reordered));

        expect(plan.skipped).toEqual([GLOBAL_ID]);
        expect(plan.toPut.size).toBe(0);
    });

    it('puts only the scope whose command changed', async () => {
        const last = await lastDeployOf(
            new Map([
                [GLOBAL_ID, [PING]],
                ['111', [CONFIG]]
            ])
        );
        const edited: CommandScopes = new Map([
            [GLOBAL_ID, [PING]],
            ['111', [{ ...CONFIG, description: 'Change the settings' }]]
        ]);

        const plan = await planDeploy(edited, last, discordMatching(edited));

        expect([...plan.toPut.keys()]).toEqual(['111']);
        expect(plan.skipped).toEqual([GLOBAL_ID]);
    });

    it('reads discord only for the scopes whose hash matches', async () => {
        const scopes: CommandScopes = new Map([
            [GLOBAL_ID, [PING]],
            ['111', [CONFIG]]
        ]);
        const last = await lastDeployOf(new Map([['111', [CONFIG]]]));
        const read = vi.fn(discordMatching(scopes));

        await planDeploy(scopes, last, read);

        expect(read).toHaveBeenCalledWith(['111']);
    });

    it('puts a matching scope again when discord holds a command the code does not', async () => {
        const scopes = new Map([[GLOBAL_ID, [PING]]]);
        const last = await lastDeployOf(scopes);

        const plan = await planDeploy(scopes, last, () =>
            Promise.resolve(new Map([[GLOBAL_ID, onDiscord([PING, CONFIG])]]))
        );

        expect([...plan.toPut.keys()]).toEqual([GLOBAL_ID]);
        expect(plan.skipped).toEqual([]);
    });
});
