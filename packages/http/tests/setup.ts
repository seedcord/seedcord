import { vi } from 'vitest';

import 'reflect-metadata';

import { clearBakedIds } from '#tests/helpers/bakedIds';
import { clearBuiltFiles } from '#tests/helpers/builtFiles';

import type * as DiscordRest from '@discordjs/rest';

// globalThis survives vi.resetModules
clearBuiltFiles();
clearBakedIds();

// the default reporters read these at registration, so a Bus built in a test has them set
process.env.UNKNOWN_EXCEPTION_WEBHOOK_URL ??= 'https://discord.com/api/webhooks/1/aaa';
process.env.HANDLED_EXCEPTION_WEBHOOK_URL ??= 'https://discord.com/api/webhooks/2/bbb';

// a real REST client would post to discord. tests read the clients through restClients()
// a factory that imports a project module caches the engine graph unmocked
vi.mock('@discordjs/rest', async (importOriginal) => {
    class FakeRest {
        public static readonly instances: FakeRest[] = [];
        public readonly get = vi.fn().mockResolvedValue({});
        public readonly post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        public readonly patch = vi.fn().mockResolvedValue({ id: 'm-1' });
        public readonly setToken = vi.fn().mockReturnThis();
        public readonly on = vi.fn().mockReturnThis();
        public readonly off = vi.fn().mockReturnThis();

        public constructor(public readonly options: Partial<DiscordRest.RESTOptions> = {}) {
            FakeRest.instances.push(this);
        }
    }
    return { ...(await importOriginal<typeof DiscordRest>()), REST: FakeRest };
});
