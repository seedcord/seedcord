import { describe, expect, it } from 'vitest';

import { scopesInCode } from '#commands/commands/codeScopes';

import type { FoundCommand } from '#core/modules/CommandScanner';
import type { CommandMeta } from '@seedcord/core/internal';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

function slash(name: string): RESTPostAPIApplicationCommandsJSONBody {
    return { name, description: name };
}

function found(json: RESTPostAPIApplicationCommandsJSONBody, meta: CommandMeta): FoundCommand {
    return { sourceFile: `/bot/commands/${json.name}.ts`, className: json.name, json, meta };
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
