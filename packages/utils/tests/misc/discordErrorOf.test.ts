import { createRequire } from 'node:module';

import * as rest from '@discordjs/rest';
import { describe, expect, it } from 'vite-plus/test';

import { discordErrorOf } from '#src/misc/discordErrorOf';

// discord.js loads this build. a gateway bot's rest throws its errors
// justified: both builds export the same classes
const commonJs = createRequire(import.meta.url)('@discordjs/rest') as typeof rest;

describe('discordErrorOf', () => {
    it.each([
        ['ES module', rest],
        ['CommonJS', commonJs]
    ])('reads the status and code of a DiscordAPIError from the %s build', (_build, { DiscordAPIError }) => {
        const error = new DiscordAPIError({ message: 'Unknown Webhook', code: 10_015 }, 10_015, 404, 'GET', '/x', {});

        expect(discordErrorOf(error)).toEqual({ status: 404, code: 10_015, url: '/x' });
    });

    it("reads an OAuth error's code", () => {
        const body = { error: 'invalid_grant', error_description: 'Invalid "code" in request.' };
        const error = new commonJs.DiscordAPIError(body, body.error, 400, 'POST', '/oauth2/token', {});

        expect(discordErrorOf(error)).toMatchObject({ status: 400, code: 'invalid_grant' });
    });

    it.each([
        ['an HTTPError, which Discord sends without a body', new rest.HTTPError(502, 'Bad Gateway', 'GET', '/x', {})],
        ["node's error with a code", Object.assign(new Error('refused'), { code: 'ECONNREFUSED', status: 0 })],
        ['a value that is not an error', { rawError: {}, status: 404, code: 1 }]
    ])("doesn't read %s", (_name, value) => {
        expect(discordErrorOf(value)).toBeUndefined();
    });
});
