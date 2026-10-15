import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { diffScope, scopesInCode } from '#commands/commands/deploy/deployPlan';

import type { FoundCommand } from '#core/modules/CommandScanner';
import type { CommandMeta } from '@seedcord/core/internal';
import type { APIApplicationCommand, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

function slash(name: string): RESTPostAPIApplicationCommandsJSONBody {
    return { name, description: name };
}

function found(json: RESTPostAPIApplicationCommandsJSONBody, meta: CommandMeta): FoundCommand {
    return { sourceFile: `/bot/commands/${json.name}.ts`, className: json.name, json, meta };
}

function deployed(name: string, type = ApplicationCommandType.ChatInput): APIApplicationCommand {
    // justified: the diff reads only name and type
    return { id: name, name, type } as APIApplicationCommand;
}

describe('scopesInCode', () => {
    it('puts each command in the scope its decorator picks', () => {
        const scopes = scopesInCode(
            [
                found(slash('ping'), { scope: 'global' }),
                found(slash('config'), { scope: 'guild', guilds: ['111', '222'] })
            ],
            []
        );

        expect(scopes.global.map((c) => c.name)).toEqual(['ping']);
        expect([...scopes.guilds].map(([id, commands]) => [id, commands.map((c) => c.name)])).toEqual([
            ['111', ['config']],
            ['222', ['config']]
        ]);
    });

    it('sends config-scoped commands to the configured guilds', () => {
        const scopes = scopesInCode(
            [found(slash('setup'), { scope: 'guild', guilds: ['config'] }), found(slash('help'), { scope: 'config' })],
            ['111']
        );

        expect(scopes.global).toEqual([]);
        expect(scopes.guilds.get('111')?.map((c) => c.name)).toEqual(['setup', 'help']);
    });

    it('keeps an empty global scope so the deploy clears it', () => {
        expect(scopesInCode([], []).global).toEqual([]);
    });
});

describe('diffScope', () => {
    it('splits a scope into added, removed and kept commands', () => {
        const diff = diffScope([slash('ping'), slash('help')], [deployed('ping'), deployed('legacy')]);

        expect(diff.added.map((c) => c.name)).toEqual(['help']);
        expect(diff.removed.map((c) => c.name)).toEqual(['legacy']);
        expect(diff.kept.map((c) => c.name)).toEqual(['ping']);
    });

    it('treats a context menu and a slash command with one name as two commands', () => {
        const menu: RESTPostAPIApplicationCommandsJSONBody = { name: 'Report', type: ApplicationCommandType.User };

        const diff = diffScope([menu], [deployed('Report')]);

        expect(diff.added).toEqual([menu]);
        expect(diff.removed.map((c) => c.name)).toEqual(['Report']);
    });
});
