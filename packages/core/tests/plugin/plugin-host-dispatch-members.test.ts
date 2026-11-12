import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { HostPlugins } from '@seedcord/types/internal';
import { describe, expect, it } from 'vite-plus/test';

import { DispatchContext, MemberValues } from '#src/dispatch/DispatchContext';
import { RepliableHandler } from '#src/handlers/RepliableHandler';
import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

import type { CoreBase } from '#interfaces/CoreBase';
import type { BaseReplySender } from '#reply/BaseReplySender';

type TestPlugin = new (host: CoreBase) => Plugin;

class Bare extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

function pluginAdding(name: string): TestPlugin {
    return class extends Bare {
        public override readonly dispatchMembers = { [name]: (): string => name };
    };
}

class Replying extends RepliableHandler<
    unknown,
    CoreBase,
    { id: string },
    never,
    BaseReplySender<{ id: string }, never>
> {
    // justified: the constructors only store these
    constructor() {
        super({}, {} as CoreBase, new DispatchContext('event', 'ready'), {} as BaseReplySender<{ id: string }, never>);
    }

    public execute(): void {}
}

describe('dispatch members at attach', () => {
    it('rejects a member name that another plugin added', () => {
        const host = new TestPluginHost().attach('first', pluginAdding('tag'));

        expect(() => host.attach('second', pluginAdding('tag'))).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDuplicateName })
        );
    });

    it('rejects one plugin attached twice with its own code', () => {
        const Tagging = pluginAdding('tag');
        const host = new TestPluginHost().attach('first', Tagging);

        expect(() => host.attach('second', Tagging)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginAttachedTwice })
        );
    });

    it('claims none of a plugin members when one of them is rejected', () => {
        class Mixed extends Bare {
            public override readonly dispatchMembers = { tag: (): string => 'a', reply: (): string => 'b' };
        }
        const host = new TestPluginHost();

        expect(() => host.attach('mixed', Mixed)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginMemberReserved })
        );
        expect(() => host.attach('tagging', pluginAdding('tag'))).not.toThrow();
    });

    it('lists each claimed member with the key its plugin is attached at', () => {
        const host = new TestPluginHost().attach('first', pluginAdding('tag')).attach('second', pluginAdding('label'));

        expect(host[HostPlugins].members).toEqual([
            { key: 'first', member: 'tag' },
            { key: 'second', member: 'label' }
        ]);
    });

    it('lets plugins with different members, or none, share a host', () => {
        const host = new TestPluginHost()
            .attach('first', pluginAdding('tag'))
            .attach('second', pluginAdding('label'))
            .attach('plainOne', Bare)
            .attach('plainTwo', Bare);

        expect(host.plainTwo).toBeInstanceOf(Bare);
    });

    // each transport's test covers the methods and gate fields. these are what only core sets
    it('rejects a member called like a handler instance field, a card field, or an Object.prototype key', () => {
        const names = [...Object.keys(new Replying()), 'toString', '__proto__', 'uuid', 'developerUsername'];

        const accepted = names.filter((name) => {
            try {
                new TestPluginHost().attach('first', pluginAdding(name));
                return true;
            } catch (error) {
                return !isSeedcordError(error, undefined, SeedcordErrorCode.CorePluginMemberReserved);
            }
        });

        expect(accepted).toEqual([]);
    });
});

describe('building dispatch members', () => {
    it('runs the functions at the same time', async () => {
        const released = Promise.withResolvers<string>();
        class Waits extends Bare {
            public override readonly dispatchMembers = { first: (): Promise<string> => released.promise };
        }
        class Releases extends Bare {
            public override readonly dispatchMembers = {
                second: (): string => {
                    released.resolve('released');
                    return 'done';
                }
            };
        }
        const host = new TestPluginHost().attach('waits', Waits).attach('releases', Releases);
        const dispatch = new DispatchContext('event', 'ready');

        await host[HostPlugins].buildMembers(dispatch, {
            userId: null,
            guildId: null,
            channelId: null,
            userLocale: null,
            guildLocale: null
        });

        expect(dispatch[MemberValues]).toEqual({ first: 'released', second: 'done' });
    });
});
