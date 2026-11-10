import { SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, FileSource, PortableSource } from 'envapt';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { Seedcord } from '#src/Seedcord';
import { testConfig } from '#tests/utils/test-config';

describe('Bot.botToken', () => {
    afterEach(() => Envapter.useSource(new FileSource()));

    it.each([{}, { DISCORD_BOT_TOKEN: '  ' }])('throws ConfigMissingEnv for %j', async (vars) => {
        Envapter.useSource(new PortableSource(vars));
        await using seedcord = new Seedcord(testConfig());

        expect(() => seedcord.bot.botToken).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigMissingEnv })
        );
    });
});
