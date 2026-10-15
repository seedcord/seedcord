import { setTimeout as sleep } from 'node:timers/promises';

import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';

import { CleanRunner } from '#commands/commands/CleanRunner';
import { CleanWizard, WIZARD_STEPS } from '#commands/commands/CleanWizard';
import { StepPrinter } from '#core/output/StepPrinter';
import { Prompter } from '#core/prompts/Prompter';

import type { REST } from '@discordjs/rest';

type Scenario = (prompter: Prompter) => Promise<unknown>;

const FIRST_GUILD_ID = 1_000_000;
const GUILD_NAMES = ["Materwelon's Lab", 'Main Hub', 'Mario Kart Club', 'Test Server', 'Staff Room', 'Bot Testing'];
// long enough to see each step's spinner
const FAKE_LATENCY_MS = 300;

const GUILDS = Array.from({ length: 40 }, (_, index) => ({
    id: String(FIRST_GUILD_ID + index),
    name: (GUILD_NAMES[index % GUILD_NAMES.length] ?? 'Guild') + (index >= GUILD_NAMES.length ? ` ${index}` : '')
}));

// every guild has ban and setup, where ban duplicates a global command
async function fakeDiscord(route: string): Promise<unknown> {
    await sleep(FAKE_LATENCY_MS);
    if (route === '/applications/@me') return { id: 'app' };
    if (route === '/users/@me/guilds') return GUILDS;
    if (route === '/applications/app/commands') return [{ id: 'global', name: 'ban' }];
    return [
        { id: 'ban', name: 'ban' },
        { id: 'setup', name: 'setup' }
    ];
}

const rest: Pick<REST, 'get' | 'delete'> = { get: fakeDiscord, delete: fakeDiscord };

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
    confirm: (prompter) => prompter.confirm({ message: 'Delete 3 guild commands? This cannot be undone.' }),
    'pick-many': (prompter) =>
        prompter.pickMany({
            message: 'Select guilds to clean',
            choices: GUILDS.map((guild) => ({ value: guild.id, label: guild.name }))
        }),
    wizard: async (prompter) => {
        const printer = new StepPrinter({ command: 'commands', labels: WIZARD_STEPS, verbose: false });
        printer.header();
        await new CleanWizard(new CleanRunner(() => rest), 'token', printer, prompter).run();
        return 'done';
    }
};

function write(line: string): void {
    process.stdout.write(`${line}\n`);
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
        if (!isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CliCancelled)) throw error;
        write(`  ${paint.mute('cancelled')}`);
    }
}

await main();
