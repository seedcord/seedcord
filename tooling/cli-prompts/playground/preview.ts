import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';

import { Prompter } from '#src/Prompter';

type Scenario = (prompter: Prompter) => Promise<unknown>;

const GUILD_NAMES = ["Materwelon's Lab", 'Main Hub', 'Mario Kart Club', 'Test Server', 'Staff Room', 'Bot Testing'];
const FIRST_GUILD_ID = 1_000_000;

const GUILDS = Array.from({ length: 40 }, (_, index) => ({
    value: String(FIRST_GUILD_ID + index),
    label: (GUILD_NAMES[index % GUILD_NAMES.length] ?? 'Guild') + (index >= GUILD_NAMES.length ? ` ${index}` : '')
}));

const COLORS = ['Blurple', 'Aqua', 'Blue', 'DarkGold', 'Gold', 'Green', 'Red', 'White', 'Yellow'];

const SCENARIOS: Record<string, Scenario> = {
    select: (prompter) =>
        prompter.select({
            message: 'How should Discord reach your bot?',
            choices: [
                { value: 'http', label: 'Http', hint: 'Discord posts interactions to your URL' },
                { value: 'gateway', label: 'Gateway', hint: 'keeps a connection to Discord open' }
            ]
        }),
    confirm: (prompter) => prompter.confirm({ message: 'Delete 3 commands? This cannot be undone.' }),
    'pick-many': (prompter) => prompter.pickMany({ message: 'Select guilds', choices: GUILDS }),
    checklist: (prompter) =>
        prompter.checklist({
            message: 'What should your bot react to?',
            choices: [
                { value: 'guild-messages', label: 'Messages in servers', hint: 'sent, edited, or deleted' },
                { value: 'message-content', label: "The messages' contents", hint: 'privileged' },
                { value: 'reactions', label: 'Reactions' },
                { value: 'voice', label: 'Voice channel activity' }
            ]
        }),
    text: (prompter) =>
        prompter.text({
            message: `Where should the project go? ${paint.mute('lowercase, digits, and . _ -')}`,
            placeholder: 'my-bot',
            validate: (value) => (/^[a-z\d][a-z\d._-]*$/.test(value) ? undefined : 'Use lowercase, digits, and . _ -')
        }),
    password: (prompter) =>
        prompter.password({
            message: `Paste your bot token ${paint.mute('or press Enter twice to add it to .env later')}`,
            emptyWarning: 'Nothing pasted. Press Enter again to leave it empty in .env for now.'
        }),
    autocomplete: (prompter) =>
        prompter.autocomplete({
            message: 'Pick an accent color, or type a hex',
            placeholder: 'Blurple',
            choices: COLORS.map((name) => ({ value: name, label: name })),
            typedChoice: (typed) =>
                /^#?[\da-f]{6}$/i.test(typed) ? { value: typed, label: typed, hint: 'hex' } : undefined
        })
};

function write(line: string): void {
    process.stdout.write(`${line}\n`);
}

async function main(): Promise<void> {
    const name = process.argv[2];
    const scenario = name ? SCENARIOS[name] : undefined;
    if (!scenario) {
        write(`usage: pnpm preview <${Object.keys(SCENARIOS).join(' | ')}>`);
        process.exitCode = 1;
        return;
    }

    write('');
    try {
        const answer = await scenario(new Prompter());
        const shown = name === 'password' ? `(${String(answer).length} characters)` : JSON.stringify(answer);
        write(`  ${paint.mute('answer')}  ${paint.sky(shown)}`);
    } catch (error) {
        if (!isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CliCancelled)) throw error;
        write(`  ${paint.mute('cancelled')}`);
    }
}

await main();
