import { DispatchContext } from '@seedcord/core/internal';
import { Plugin, PluginHost } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { eventGateContext, interactionGateContext } from '#bot/gates/context';
import * as handlers from '#src/handlers/index';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { Config } from '@seedcord/types';
import type { ClientEvents } from 'discord.js';

class Host extends PluginHost<'gateway', 'server'> {
    // justified: attach reads nothing off these
    public readonly config = {} as Config;
    public readonly rest = {} as PluginHost<'gateway', 'server'>['rest'];
    public readonly applicationId = 'app-1';

    constructor() {
        super('gateway', 'server', undefined);
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
    const dispatch = new DispatchContext('event', 'ready');
    // justified: the builders read only these interaction fields
    const interaction = { user: { id: 'u1' }, appPermissions: { bitfield: 0n } } as unknown as Repliables;
    const core = {} as Core;
    const args = [] as unknown as ClientEvents['messageCreate'];
    return [
        ...Object.keys(interactionGateContext(interaction, core, dispatch)),
        ...Object.keys(eventGateContext('messageCreate', args, core, dispatch))
    ];
}

const memberNames = new Set([...Object.values(handlers).flatMap(prototypeMemberNames), ...gateContextNames()]);

describe('reserved dispatch member names on gateway', () => {
    it.each([...memberNames])('reserves %s', (name) => {
        const attachRaw = Host.prototype.attach.bind(new Host()) as (key: string, plugin: unknown) => unknown;

        expect(() => attachRaw('first', pluginAdding(name))).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginMemberReserved })
        );
    });
});
