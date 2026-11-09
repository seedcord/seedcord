import { SeedcordErrorCode } from '@seedcord/errors';
import { HostPluginHooks } from '@seedcord/types/internal';
import { describe, expect, it } from 'vitest';

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

function handlerMemberNames(): string[] {
    const handler = new Replying();
    const names = Object.keys(handler);
    for (
        let proto: unknown = Object.getPrototypeOf(handler);
        proto !== Object.prototype;
        proto = Object.getPrototypeOf(proto)
    ) {
        names.push(...Object.getOwnPropertyNames(proto));
    }
    return names;
}

describe('dispatch members at attach', () => {
    it('rejects a member name that another plugin added', () => {
        const host = new TestPluginHost().attach('first', pluginAdding('tag'));

        expect(() => host.attach('second', pluginAdding('tag'))).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDuplicateName })
        );
    });

    it('rejects one plugin attached twice', () => {
        const Tagging = pluginAdding('tag');
        const host = new TestPluginHost().attach('first', Tagging);

        expect(() => host.attach('second', Tagging)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDuplicateName })
        );
    });

    it('lets plugins with different members, or none, share a host', () => {
        const host = new TestPluginHost()
            .attach('first', pluginAdding('tag'))
            .attach('second', pluginAdding('label'))
            .attach('plainOne', Bare)
            .attach('plainTwo', Bare);

        expect(host.plainTwo).toBeInstanceOf(Bare);
    });

    it.each([...handlerMemberNames(), 'toString', '__proto__', 'uuid', 'developerUsername'])(
        'rejects the reserved name %s',
        (name) => {
            const host = new TestPluginHost();

            expect(() => host.attach('first', pluginAdding(name))).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.CorePluginMemberReserved })
            );
        }
    );
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

        await host[HostPluginHooks].buildMembers(dispatch, {
            userId: null,
            guildId: null,
            channelId: null,
            userLocale: null,
            guildLocale: null
        });

        expect(dispatch[MemberValues]).toEqual({ first: 'released', second: 'done' });
    });
});
