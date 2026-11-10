import { DispatchContext } from '@seedcord/core/internal';
import { PluginHost } from '@seedcord/core/plugin';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { eventGateContext, interactionGateContext } from '#bot/gates/context';
import * as handlers from '#src/handlers/index';
import { pluginWithMembers } from '#tests/utils/pluginWithMembers';

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

function attachRejects(name: string): boolean {
    try {
        new Host().attach('first', pluginWithMembers({ [name]: () => name }));
        return false;
    } catch (error) {
        return isSeedcordError(error, undefined, SeedcordErrorCode.CorePluginMemberReserved);
    }
}

describe('reserved dispatch member names on gateway', () => {
    it('reserves every handler member and gate context field', () => {
        expect([...memberNames].filter((name) => !attachRejects(name))).toEqual([]);
    });
});
