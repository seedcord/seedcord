import 'reflect-metadata';

import { TextDisplayBuilder } from '@discordjs/builders';
import { defineGate, Notice, Silence } from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { MessageFlags } from 'discord-api-types/v10';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlashHandler } from '@handlers/interaction/SlashHandler';

import { capturingCtx, emptyManifest, readyEngine, signedRequest, slashPayload } from './harness';

import type { Gate, GateContextBase } from '@seedcord/core';
import type { RenderContext, ReplyResponse } from '@seedcord/types';

const rest = vi.hoisted(() => {
    interface FakeRestInstance {
        post: ReturnType<typeof vi.fn>;
        patch: ReturnType<typeof vi.fn>;
    }
    const instances: FakeRestInstance[] = [];
    class FakeRest {
        public post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        public patch = vi.fn().mockResolvedValue({ id: 'm-1' });

        public constructor() {
            instances.push(this);
        }

        public setToken(): this {
            return this;
        }
    }
    return { instances, FakeRest };
});

// the factory must not import project modules, vitest loads factory imports in a mock-bypass
// context that would cache the engine graph unmocked
vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    REST: rest.FakeRest
}));

class TestNotice extends Notice {
    public constructor(message = 'refused') {
        super(message);
    }

    public render(_ctx: RenderContext): ReplyResponse {
        return { components: [new TextDisplayBuilder().setContent('you shall not pass')] };
    }
}

function gated(gates: Gate<GateContextBase>[]): {
    manifest: ReturnType<typeof emptyManifest>;
    executed: () => boolean;
} {
    let didExecute = false;
    class Guarded extends SlashHandler<never> {
        async execute(): Promise<void> {
            didExecute = true;
            await this.reply('ran');
        }
    }
    Reflect.defineMetadata(GatedMetadataKey, gates, Guarded);
    return {
        manifest: {
            ...emptyManifest(),
            commands: [{ name: 'guarded', type: 1, load: () => Promise.resolve({ Guarded }) }]
        },
        executed: () => didExecute
    };
}

beforeEach(() => {
    rest.instances.length = 0;
});

describe('handler gates', () => {
    it('renders a gate Notice through the sender as an ephemeral type 4 before the 202 returns', async () => {
        const refuse = defineGate('refuse', () => {
            throw new TestNotice();
        });
        const { manifest, executed } = gated([refuse]);
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, slashPayload('guarded')), ctx);

        expect(response.status).toBe(202);
        expect(executed()).toBe(false);
        expect(ctx.waitUntil).not.toHaveBeenCalled();
        const first = rest.instances[0];
        expect(first?.post).toHaveBeenCalledTimes(1);
        const [route, options] = first?.post.mock.calls[0] as [
            string,
            { body: { type: number; data: { flags: number; components: unknown[] } } }
        ];
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(options.body.type).toBe(4);
        expect(options.body.data.flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
        expect(options.body.data.components).toEqual([
            new TextDisplayBuilder().setContent('you shall not pass').toJSON()
        ]);
    });

    it('drops the interaction with no reply on a gate Silence', async () => {
        const drop = defineGate('drop', () => {
            throw new Silence('blacklisted');
        });
        const { manifest, executed } = gated([drop]);
        const { signer, handle } = await readyEngine(manifest);

        const response = await handle(await signedRequest(signer, slashPayload('guarded')));

        expect(response.status).toBe(202);
        expect(executed()).toBe(false);
        expect(rest.instances[0]?.post ?? vi.fn()).not.toHaveBeenCalled();
    });

    it('runs execute when every gate passes', async () => {
        const open = defineGate('open', () => {
            /* passes */
        });
        const { manifest, executed } = gated([open]);
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('guarded')), ctx);
        await ctx.settled();

        expect(executed()).toBe(true);
    });

    it('hands gates the scalar identity from the raw payload plus the resolved route id', async () => {
        let seen: GateContextBase | undefined;
        const capture = defineGate('capture', (gateCtx) => {
            seen = gateCtx;
        });
        const { manifest } = gated([capture]);
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const payload = {
            ...slashPayload('guarded'),
            guild_id: 'g-1',
            channel: { id: 'c-1', type: 0 },
            member: {
                user: { id: 'u-1', username: 'tester' },
                roles: ['r-1', 'r-2'],
                permissions: '2048'
            }
        };
        await handle(await signedRequest(signer, payload), ctx);
        await ctx.settled();

        expect(seen).toMatchObject({
            userId: 'u-1',
            guildId: 'g-1',
            channelId: 'c-1',
            memberRoleIds: ['r-1', 'r-2'],
            memberPermissions: 2048n,
            routeId: 'slash:guarded'
        });
    });

    it('reads the invoking user for a DM payload that carries no member', async () => {
        let seen: GateContextBase | undefined;
        const capture = defineGate('capture', (gateCtx) => {
            seen = gateCtx;
        });
        const { manifest } = gated([capture]);
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        const payload = { ...slashPayload('guarded'), user: { id: 'u-dm', username: 'dm' } };
        await handle(await signedRequest(signer, payload), ctx);
        await ctx.settled();

        expect(seen).toMatchObject({
            userId: 'u-dm',
            guildId: null,
            memberRoleIds: [],
            memberPermissions: null
        });
    });
});
