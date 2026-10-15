import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { Prompter } from '#core/prompts/Prompter';

type Scenario = (prompter: Prompter) => Promise<unknown>;

const SCENARIOS: Record<string, Scenario> = {
    select: (prompter) =>
        prompter.select({
            message: 'Remove guild commands that duplicate a global command. Which guilds?',
            choices: [
                { value: 'pick', label: 'Pick specific guilds' },
                {
                    value: 'all',
                    label: 'All guilds the bot is in',
                    hint: 'duplicates only, pick specific guilds for a full reset'
                }
            ]
        }),
    confirm: (prompter) => prompter.confirm({ message: 'Delete 3 guild commands? This cannot be undone.' })
};

function write(line: string): void {
    process.stdout.write(`${line}\n`);
}

function isCancel(error: unknown): boolean {
    return error instanceof SeedcordError && error.code === SeedcordErrorCode.CliCancelled;
}

async function main(): Promise<void> {
    const name = process.argv[2];
    const scenario = name ? SCENARIOS[name] : undefined;
    if (!scenario) {
        write(`usage: pnpm preview:prompts <${Object.keys(SCENARIOS).join(' | ')}>`);
        process.exitCode = 1;
        return;
    }

    write('');
    try {
        const answer = await scenario(new Prompter());
        write(`  ${paint.mute('answer')}  ${paint.sky(JSON.stringify(answer))}`);
    } catch (error) {
        if (!isCancel(error)) throw error;
        write(`  ${paint.mute('cancelled')}`);
    }
}

await main();
