import { setTimeout as sleep } from 'node:timers/promises';

import { REST } from '@discordjs/rest';
import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';

import { askClean } from '#commands/commands/clean/CleanMode';
import { askPurge } from '#commands/commands/purge/PurgeMode';
import { RemoveRunner } from '#commands/commands/remove/RemoveRunner';
import { RemoveWizard, WIZARD_STEPS } from '#commands/commands/remove/RemoveWizard';
import { StepPrinter } from '#core/output/StepPrinter';
import { Prompter } from '#core/prompts/Prompter';

import type { WizardQuestions } from '#commands/commands/remove/RemoveWizard';

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

const rest = new REST();
rest.get = fakeDiscord;
rest.put = fakeDiscord;
rest.delete = fakeDiscord;

const SCENARIOS: Record<string, Scenario> = {
    select: (prompter) =>
        prompter.select({
            message: 'Remove guild commands that duplicate a global command. Which guilds?',
            choices: [
                { value: 'pick', label: 'Pick specific guilds' },
                { value: 'all', label: 'All guilds the bot is in' }
            ]
        }),
    confirm: (prompter) => prompter.confirm({ message: 'Delete 3 commands? This cannot be undone.' }),
    'pick-many': (prompter) =>
        prompter.pickMany({
            message: 'Select guilds',
            choices: GUILDS.map((guild) => ({ value: guild.id, label: guild.name }))
        }),
    clean: (prompter) => runWizard(prompter, askClean),
    purge: (prompter) => runWizard(prompter, askPurge)
};

async function runWizard(prompter: Prompter, questions: WizardQuestions): Promise<string> {
    const printer = new StepPrinter({ command: 'commands', labels: WIZARD_STEPS, verbose: false });
    printer.header();
    await new RemoveWizard(new RemoveRunner({ openDiscord: () => rest }), printer, prompter, false).run(questions);
    return 'done';
}

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
