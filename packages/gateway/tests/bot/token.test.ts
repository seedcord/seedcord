import { SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, FileSource, PortableSource } from 'envapt';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { Seedcord } from '#src/Seedcord';
import { testConfig } from '#tests/utils/test-config';

const APP_ID = '1195232619718254663';

// discord strips the base64 padding
const tokenOf = (applicationId: string): string =>
    `${btoa(applicationId).replaceAll('=', '')}.${'b'.repeat(6)}.${'c'.repeat(27)}`;

describe('Bot.botToken', () => {
    afterEach(() => Envapter.useSource(new FileSource()));

    it.each([{}, { DISCORD_BOT_TOKEN: '  ' }])('throws ConfigMissingEnv for %j', async (vars) => {
        Envapter.useSource(new PortableSource(vars));
        await using seedcord = new Seedcord(testConfig());

        expect(() => seedcord.bot.botToken).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigMissingEnv })
        );
    });

    it('reads BOT_TOKEN when DISCORD_BOT_TOKEN is unset', async () => {
        Envapter.useSource(new PortableSource({ BOT_TOKEN: tokenOf(APP_ID) }));
        await using seedcord = new Seedcord(testConfig());

        expect(seedcord.bot.botToken).toBe(tokenOf(APP_ID));
    });

    it('reads DISCORD_BOT_TOKEN when both are set', async () => {
        const first = tokenOf('1195232619718254664');
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: first, BOT_TOKEN: tokenOf(APP_ID) }));
        await using seedcord = new Seedcord(testConfig());

        expect(seedcord.bot.botToken).toBe(first);
    });
});
