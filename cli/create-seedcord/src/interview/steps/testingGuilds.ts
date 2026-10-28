import { validatorFor } from '@seedcord/cli-prompts';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { isSnowflake, SeedcordTypeError } from '@seedcord/errors/internal';

import type { Step } from '#interview/types';

function parseTestingGuilds(raw: string): string[] {
    const ids = raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '');

    const bad = ids.find((id) => !isSnowflake(id));
    if (bad !== undefined) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'testing-guilds',
            `"${bad}" is not a server id. Right-click the server in Discord with Developer Mode on and pick Copy Server ID.`
        ]);
    }

    return ids;
}

export const testingGuildsStep: Step<'testingGuilds'> = {
    key: 'testingGuilds',
    label: 'test servers',
    flag: {
        name: 'testing-guilds',
        description: 'comma-separated server ids your commands deploy to while you build',
        parse: parseTestingGuilds
    },
    answerWithoutTerminal: [],
    ask: async (_answers, prompter) =>
        parseTestingGuilds(
            await prompter.text({
                message: `Server ids to test your commands in ${paint.mute('or press Enter to deploy them globally')}`,
                validate: validatorFor([SeedcordErrorCode.CreateInvalidAnswer], parseTestingGuilds)
            })
        ),
    shown: (ids) => (ids.length === 0 ? paint.mute('global') : ids.join(', '))
};
