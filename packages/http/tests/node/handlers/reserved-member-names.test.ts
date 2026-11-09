import { Plugin, PluginHost } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import * as handlers from '#src/handlers/index';

import type { Config } from '@seedcord/types';

class Host extends PluginHost<'http', 'server'> {
    // justified: attach reads nothing off these
    public readonly config = {} as Config;
    public readonly rest = {} as PluginHost<'http', 'server'>['rest'];
    public readonly applicationId = 'app-1';

    constructor() {
        super('http', 'server', undefined);
    }
}

function pluginAdding(name: string): new (host: Host) => Plugin {
    return class extends Plugin {
        public override readonly dispatchMembers = { [name]: (): string => name };

        public init(): Promise<void> {
            return Promise.resolve();
        }
    };
}

function prototypeMemberNames({ prototype }: { prototype: object }): string[] {
    const names: string[] = [];
    for (let proto = prototype; proto !== Object.prototype; proto = Object.getPrototypeOf(proto) as object) {
        names.push(...Object.getOwnPropertyNames(proto));
    }
    return names;
}

describe('reserved dispatch member names on http', () => {
    it.each([...new Set(Object.values(handlers).flatMap(prototypeMemberNames))])('reserves %s', (name) => {
        const attachRaw = Host.prototype.attach.bind(new Host()) as (key: string, plugin: unknown) => unknown;

        expect(() => attachRaw('first', pluginAdding(name))).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginMemberReserved })
        );
    });
});
