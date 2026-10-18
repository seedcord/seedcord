import { Prompter } from '@seedcord/cli-prompts';
import { describe, expect, it } from 'vitest';

import { parseInput } from '#cli/parseInput';
import { runFlow } from '#interview/runFlow';
import { testingGuildsStep } from '#interview/steps/testingGuilds';

const GUILD = '613425648685547541';
const OTHER_GUILD = '1100000000000000000';

class TypesNothing extends Prompter {
    public override text(): Promise<string> {
        return Promise.resolve('');
    }
}

describe('the testing guilds step', () => {
    it('reads a comma separated list of guild ids from --testing-guilds', () => {
        const supplied = parseInput(['my-bot', '--testing-guilds', `${GUILD}, ${OTHER_GUILD}`]);

        expect(supplied.testingGuilds).toEqual([GUILD, OTHER_GUILD]);
    });

    it('reads an empty --testing-guilds as a global deploy', () => {
        expect(parseInput(['my-bot', '--testing-guilds', '']).testingGuilds).toEqual([]);
    });

    it('deploys globally when there is no terminal to ask on', async () => {
        const answers = await runFlow([testingGuildsStep], {}, { interactive: false });

        expect(answers.testingGuilds).toEqual([]);
    });

    it('deploys globally when Enter skips the question', async () => {
        expect(await testingGuildsStep.ask({}, new TypesNothing())).toEqual([]);
    });
});
