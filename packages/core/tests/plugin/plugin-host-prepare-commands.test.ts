import { HostPlugins } from '@seedcord/types/internal';
import { describe, expect, it } from 'vite-plus/test';

import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

import type { CoreBase } from '#interfaces/CoreBase';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

type Bodies = readonly RESTPostAPIApplicationCommandsJSONBody[];
type TestPlugin = new (host: CoreBase) => Plugin;

function pluginAdding(suffix: string): TestPlugin {
    return class extends Plugin {
        public init(): Promise<void> {
            return Promise.resolve();
        }

        public override prepareCommands(commands: Bodies): void {
            for (const command of commands) command.name += `-${suffix}`;
        }
    };
}

describe('prepareCommands', () => {
    it('runs each plugin in attach order on the same commands', async () => {
        const host = new TestPluginHost().attach('first', pluginAdding('one')).attach('second', pluginAdding('two'));
        const ping: RESTPostAPIApplicationCommandsJSONBody = { name: 'ping', description: 'Pong' };

        await host[HostPlugins].prepareCommands([ping]);

        expect(ping.name).toBe('ping-one-two');
    });
});
