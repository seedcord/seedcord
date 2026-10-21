import { setTimeout as sleep } from 'node:timers/promises';

import { REST, RESTEvents } from '@discordjs/rest';
import { Prompter } from '@seedcord/cli-prompts';
import { GLOBAL_ID, putCommands } from '@seedcord/core/internal';
import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';

import { askClean } from '#commands/commands/clean/CleanMode';
import { askPurge } from '#commands/commands/purge/PurgeMode';
import { RemoveRunner } from '#commands/commands/remove/RemoveRunner';
import { RemoveWizard, WIZARD_STEPS } from '#commands/commands/remove/RemoveWizard';
import { cliLogger } from '#core/cliLogger';
import { StepPrinter } from '#core/output/StepPrinter';

import type { RemoveDeps } from '#commands/commands/remove/RemoveRunner';
import type { WizardQuestions } from '#commands/commands/remove/RemoveWizard';
import type { SeedcordInstance } from '@seedcord/types/internal';

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

const REMOVE_DEPS: RemoveDeps = {
    openDiscord: () => rest,
    // justified: openDiscord above ignores the instance
    loadInstance: () => Promise.resolve({} as SeedcordInstance)
};

// long enough to read the warning while the deploy step spins
const RATE_LIMIT_MS = 5000;

// stands in for a third global command PUT inside a minute, past discord's limit of 2
const rateLimitedRest = new REST();
rateLimitedRest.put = async (route) => {
    rateLimitedRest.emit(RESTEvents.RateLimited, {
        global: false,
        method: 'PUT',
        url: route,
        route,
        majorParameter: 'app',
        hash: 'bucket',
        limit: 2,
        timeToReset: RATE_LIMIT_MS,
        retryAfter: RATE_LIMIT_MS,
        sublimitTimeout: 0,
        scope: 'user'
    });
    await sleep(RATE_LIMIT_MS);
    return [{ id: 'ping', name: 'ping', type: 1 }];
};

async function rateLimitedDeploy(): Promise<string> {
    const printer = new StepPrinter({ command: 'commands', labels: ['read discord', 'deploy'], verbose: false });
    printer.header();
    await printer.step('read discord', () => sleep(FAKE_LATENCY_MS));
    const scopes = new Map([[GLOBAL_ID, [{ name: 'ping', description: 'Replies with pong' }]]]);
    await printer.step(
        'deploy',
        () => putCommands(scopes, { rest: rateLimitedRest, applicationId: 'app', logger: cliLogger('Commands') }),
        () => '1 global'
    );
    return 'done';
}

const SCENARIOS: Record<string, Scenario> = {
    clean: (prompter) => runWizard(prompter, askClean),
    purge: (prompter) => runWizard(prompter, askPurge),
    deploy: rateLimitedDeploy
};

async function runWizard(prompter: Prompter, questions: WizardQuestions): Promise<string> {
    const printer = new StepPrinter({ command: 'commands', labels: WIZARD_STEPS, verbose: false });
    printer.header();
    await new RemoveWizard(new RemoveRunner(REMOVE_DEPS), printer, prompter, false).run(questions);
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
