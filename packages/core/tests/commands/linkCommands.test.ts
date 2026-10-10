import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { linkCommands } from '#src/commands/linkCommands';
import { deployed, guildBucket, ping, userMenu, withSubcommand } from '#tests/commands/fixtures';

describe('linkCommands', () => {
    it('links each slash route and context menu to its deployed id', () => {
        const linked = linkCommands(
            {
                global: deployed([
                    ['1', 'ban'],
                    ['2', 'View Profile', ApplicationCommandType.User]
                ]),
                guilds: new Map()
            },
            [withSubcommand(), userMenu()]
        );

        expect(linked.commands['ban/list']?.mention).toBe('</ban list:1>');
        expect(linked.contextMenus.user['View Profile']?.id).toBe('2');
    });

    it('lists every command in code with no deployed id', () => {
        const linked = linkCommands({ global: new Map(), guilds: new Map() }, [ping(), userMenu()]);

        expect(linked.notDeployed).toEqual([
            { name: 'ping', type: ApplicationCommandType.ChatInput },
            { name: 'View Profile', type: ApplicationCommandType.User }
        ]);
    });

    it('lists a command deployed to two or more guilds once, apart from the undeployed ones', () => {
        const buckets = guildBucket('g1', [['1', 'ping']]);
        buckets.set('g2', deployed([['2', 'ping']]));

        const linked = linkCommands({ global: new Map(), guilds: buckets }, [ping(), ping()]);

        expect(linked.multiGuild).toEqual([{ name: 'ping', type: ApplicationCommandType.ChatInput }]);
        expect(linked.notDeployed).toEqual([]);
    });

    it('lists each deployed command that no command in code matches', () => {
        const linked = linkCommands(
            {
                global: deployed([
                    ['1', 'ping'],
                    ['2', 'probe']
                ]),
                guilds: guildBucket('g1', [['3', 'probe']])
            },
            [ping()]
        );

        expect(linked.notInCode).toEqual([{ name: 'probe', type: ApplicationCommandType.ChatInput }]);
    });
});
