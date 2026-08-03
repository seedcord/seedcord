import { vi } from 'vitest';

import 'reflect-metadata';

import type * as DiscordRest from '@discordjs/rest';

// the default reporters read these at registration, so a Bus built in a test has them set
process.env.UNKNOWN_EXCEPTION_WEBHOOK_URL ??= 'https://discord.com/api/webhooks/1/aaa';
process.env.HANDLED_EXCEPTION_WEBHOOK_URL ??= 'https://discord.com/api/webhooks/2/bbb';

// publishing a default key runs a shipped reporter, and a real REST client would post to discord
vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<typeof DiscordRest>()),
    REST: class {
        get = vi.fn().mockResolvedValue({});
        post = vi.fn().mockResolvedValue(undefined);
        patch = vi.fn().mockResolvedValue(undefined);
        setToken = vi.fn().mockReturnThis();
    }
}));
