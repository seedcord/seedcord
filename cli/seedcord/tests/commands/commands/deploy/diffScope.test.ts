import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { diffScope } from '#commands/commands/deploy/diffScope';

import type { APIApplicationCommand, RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

function slash(name: string): RESTPostAPIApplicationCommandsJSONBody {
    return { name, description: name };
}

function deployed(name: string, type = ApplicationCommandType.ChatInput): APIApplicationCommand {
    // justified: the diff reads only name and type
    return { id: name, name, type } as APIApplicationCommand;
}

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
