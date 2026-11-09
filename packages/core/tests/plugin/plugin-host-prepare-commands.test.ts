import { SeedcordErrorCode } from '@seedcord/errors';
import { HostPrepareCommands } from '@seedcord/types/internal';
import { describe, expect, it } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

import type { CoreBase } from '#interfaces/CoreBase';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

type Bodies = RESTPostAPIApplicationCommandsJSONBody[];
type TestPlugin = new (host: CoreBase) => Plugin;

const PING: RESTPostAPIApplicationCommandsJSONBody = { name: 'ping', description: 'Pong' };

function pluginPreparing(prepare: (commands: Bodies) => Bodies): TestPlugin {
    return class extends Plugin {
        public init(): Promise<void> {
            return Promise.resolve();
        }

        public override prepareCommands(commands: Bodies): Bodies {
            return prepare(commands);
        }
    };
}

const suffixed = (suffix: string) => (commands: Bodies) =>
    commands.map((command) => ({ ...command, name: `${command.name}-${suffix}` }));

describe('prepareCommands', () => {
    it('hands each plugin what the plugin attached before it returned', async () => {
        const host = new TestPluginHost()
            .attach('first', pluginPreparing(suffixed('one')))
            .attach('second', pluginPreparing(suffixed('two')));

        const prepared = await host[HostPrepareCommands]([PING]);

        expect(prepared).toEqual([{ name: 'ping-one-two', description: 'Pong' }]);
    });

    it('returns the commands unchanged when no plugin prepares them', async () => {
        await expect(new TestPluginHost()[HostPrepareCommands]([PING])).resolves.toEqual([PING]);
    });

    it('rejects a plugin that returns a different number of commands', async () => {
        const host = new TestPluginHost().attach(
            'dropper',
            pluginPreparing(() => [])
        );

        await expect(host[HostPrepareCommands]([PING])).rejects.toMatchObject({
            code: SeedcordErrorCode.CorePluginCommandCountChanged
        });
    });
});
