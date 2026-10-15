import { vi } from 'vitest';

import 'reflect-metadata';

import type * as DiscordRest from '@discordjs/rest';

// the default reporters read these at registration. assigned outright so a shell's own values change nothing
process.env.UNKNOWN_EXCEPTION_WEBHOOK_URL = 'https://discord.com/api/webhooks/1/aaa';
process.env.HANDLED_EXCEPTION_WEBHOOK_URL = 'https://discord.com/api/webhooks/2/bbb';

// publishing a default key runs a shipped reporter, and a real REST client would post to discord.
// a test spies on REST.prototype to read or change a call
vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<typeof DiscordRest>()),
    REST: class {
        public get(): Promise<unknown> {
            return Promise.resolve({});
        }
        public post(): Promise<unknown> {
            return Promise.resolve(undefined);
        }
        public patch(): Promise<unknown> {
            return Promise.resolve(undefined);
        }
        public setToken(): this {
            return this;
        }
        public on(): this {
            return this;
        }
        public off(): this {
            return this;
        }
    }
}));
