import 'reflect-metadata';

import { defineGate, Notice } from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';

import { FROM, capturingCtx, emptyManifest, readyEngine, signedRequest } from './harness';

import type { RouteManifest } from '#src/manifest/RouteManifest';
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
    public constructor() {
        super('refused');
    }

    public render(_ctx: RenderContext): ReplyResponse {
        return { components: [] };
    }
}

function autocompletePayload(name: string): object {
    return {
        type: 4,
        id: 'int-1',
        application_id: 'app-1',
        token: 'tok',
        data: { type: 1, name, options: [{ type: 3, name: 'query', value: 'ap', focused: true }] }
    };
}

function manifestFor(handler: unknown, name: string): RouteManifest {
    return {
        ...emptyManifest(),
        autocompleteRoutes: [{ name, exportName: 'handler', from: FROM, load: () => Promise.resolve({ handler }) }]
    };
}

interface CallbackCall {
    route: string;
    body: { type: number; data: { choices: { name: string; value: string }[] } };
}

function firstPost(): CallbackCall {
    const [route, options] = rest.instances[0]?.post.mock.calls[0] as [string, { body: CallbackCall['body'] }];
    return { route, body: options.body };
}

beforeEach(() => {
    rest.instances.length = 0;
});

describe('autocomplete dispatch', () => {
    it('routes a signed autocomplete request to its handler, whose respond posts a type 8', async () => {
        class Search extends AutocompleteHandler<never> {
            async execute(): Promise<void> {
                await this.respond([{ name: 'apple', value: 'apple' }]);
            }
        }
        const { signer, handle } = await readyEngine(manifestFor(Search, 'search'));
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, autocompletePayload('search')), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        const { route, body } = firstPost();
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(body.type).toBe(8);
        expect(body.data.choices).toEqual([{ name: 'apple', value: 'apple' }]);
    });

    it('skips gate metadata on an autocomplete handler and runs execute', async () => {
        let didExecute = false;
        class Search extends AutocompleteHandler<never> {
            async execute(): Promise<void> {
                didExecute = true;
                await this.respond([{ name: 'apple', value: 'apple' }]);
            }
        }
        const refuse = defineGate('refuse', () => {
            throw new TestNotice();
        });
        // @Gated rejects a gate on an autocomplete handler at compile time, this backstops a metadata-set gate at runtime
        Reflect.defineMetadata(GatedMetadataKey, [refuse], Search);
        const { signer, handle } = await readyEngine(manifestFor(Search, 'search'));
        const ctx = capturingCtx();

        const response = await handle(await signedRequest(signer, autocompletePayload('search')), ctx);
        await ctx.settled();

        expect(response.status).toBe(202);
        expect(didExecute).toBe(true);
        const { body } = firstPost();
        expect(body.type).toBe(8);
        expect(body.data.choices).toEqual([{ name: 'apple', value: 'apple' }]);
    });
});
