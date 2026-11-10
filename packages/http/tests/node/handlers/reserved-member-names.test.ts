import { DispatchContext } from '@seedcord/core/internal';
import { Plugin, PluginHost } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { interactionGateContext } from '#src/gates/context';
import * as handlers from '#src/handlers/index';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
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

function gateContextNames(): string[] {
    // justified: the builder reads only these payload fields
    const payload = { user: { id: 'u1' }, app_permissions: '0' } as unknown as Repliables;
    return Object.keys(interactionGateContext(payload, {} as Core, new DispatchContext('slash', 'probe')));
}

const memberNames = new Set([...Object.values(handlers).flatMap(prototypeMemberNames), ...gateContextNames()]);

describe('reserved dispatch member names on http', () => {
    it.each([...memberNames])('reserves %s', (name) => {
        const attachRaw = Host.prototype.attach.bind(new Host()) as (key: string, plugin: unknown) => unknown;

        expect(() => attachRaw('first', pluginAdding(name))).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginMemberReserved })
        );
    });
});
