import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { KEY, PromptTerminal, settled } from '@seedcord/cli-prompts/testing';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { MAKE_STEPS, MakeRunner } from '#commands/make/MakeRunner';
import { StepPrinter } from '#core/output/StepPrinter';
import { makeProject } from '#tests/commands/make/makeProject';
import { loadedConfig } from '#tests/loadedConfig';
import { maskStepTimes } from '#tests/maskStepTimes';
import { resolvedConfigOf } from '#tests/resolvedConfigOf';

const GATEWAY_BOT = {
    'package.json': JSON.stringify({ dependencies: { '@seedcord/gateway': '1.0.0' } }),
    'node_modules/@seedcord/gateway/package.json': '{}'
};

function make(terminal: PromptTerminal, projectDir: string, interactive = true): Promise<void> {
    const printer = new StepPrinter({
        command: 'make',
        labels: MAKE_STEPS,
        verbose: false,
        stdout: terminal.stdout,
        stderr: terminal.stdout
    });
    const config = resolvedConfigOf(projectDir);
    return new MakeRunner({
        steps: printer,
        prompter: terminal.prompter,
        projectLoader: { readConfig: () => Promise.resolve(loadedConfig(config)) },
        interactive
    }).run();
}

describe('MakeRunner', () => {
    it('writes the picked template under the typed name with the answers, and lists what it wrote', async () => {
        using terminal = new PromptTerminal();
        const projectDir = makeProject({
            ...GATEWAY_BOT,
            'templates/Button/handlers/{{pascal name}}.ts.hbs':
                "import '{{transport}}';\nexport const label = '{{label}}';\n"
        });
        const done = make(terminal, projectDir);

        await terminal.press(KEY.enter);
        await terminal.press('appeal', KEY.enter);
        await terminal.press('Appeal now', KEY.enter);
        await done;

        expect(readFileSync(join(projectDir, 'src/handlers/Appeal.ts'), 'utf8')).toBe(
            "import '@seedcord/gateway';\nexport const label = 'Appeal now';\n"
        );
        const screen = maskStepTimes(await terminal.screen());
        expect(screen).toContain('write                T  1 file\n      │ ');
        expect(screen.replaceAll('\n', '')).toContain(join(projectDir, 'src/handlers/Appeal.ts'));
        expect(screen).toContain('Run seedcord codegen, or keep seedcord dev running, to type new routes.');
    });

    it('asks yes or no, a comma separated list, one entry at a time, and each field of an entry', async () => {
        using terminal = new PromptTerminal();
        const projectDir = makeProject({
            ...GATEWAY_BOT,
            'templates/Slash/{{pascal name}}.ts.hbs': [
                '{{#if ephemeral}}e{{/if}}',
                '{{#each choices}}{{this}}.{{/each}}',
                '{{#each options}}{{name}}{{#if required}}!{{/if}};{{/each}}',
                '{{author.name}}'
            ].join(' ')
        });
        const done = make(terminal, projectDir);

        await terminal.press(KEY.enter);
        await terminal.press('roll', KEY.enter);
        await terminal.press('y', KEY.enter);
        await terminal.press('a, b', KEY.enter);
        await terminal.press('y', KEY.enter, 'sides', KEY.enter, 'y', KEY.enter);
        await terminal.press('y', KEY.enter, 'mode', KEY.enter, KEY.enter);
        await terminal.press(KEY.enter);
        await terminal.press('Dhruv', KEY.enter);
        await done;

        expect(readFileSync(join(projectDir, 'src/Roll.ts'), 'utf8')).toBe('e a.b. sides!;mode; Dhruv');
    });

    it('throws MakeNeedsTerminal without a terminal', async () => {
        using terminal = new PromptTerminal();

        await expect(make(terminal, makeProject(GATEWAY_BOT), false)).rejects.toMatchObject({
            code: SeedcordErrorCode.MakeNeedsTerminal
        });
    });

    it('throws MakeNoTemplates with the templates folder when the bot and its plugins have none', async () => {
        using terminal = new PromptTerminal();
        const projectDir = makeProject(GATEWAY_BOT);

        await expect(make(terminal, projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.MakeNoTemplates,
            message: expect.stringContaining(join(projectDir, 'templates')) as string
        });
    });

    it('writes nothing when a prompt is cancelled', async () => {
        using terminal = new PromptTerminal();
        const projectDir = makeProject({ ...GATEWAY_BOT, 'templates/Button/{{pascal name}}.ts.hbs': '{{label}}' });
        const done = make(terminal, projectDir);

        await terminal.press(KEY.enter, 'appeal', KEY.enter);
        await terminal.cancel(done);

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.CliCancelled });
        expect(existsSync(join(projectDir, 'src/Appeal.ts'))).toBe(false);
    });

    it('throws MakeTemplateFailed after the name when a file name reads any other value', async () => {
        using terminal = new PromptTerminal();
        const projectDir = makeProject({ ...GATEWAY_BOT, 'templates/Button/{{label}}.ts.hbs': '' });
        const done = make(terminal, projectDir);

        await terminal.press(KEY.enter, 'appeal', KEY.enter);

        await expect(done).rejects.toMatchObject({ code: SeedcordErrorCode.MakeTemplateFailed });
    });

    it.each([
        ['a name that can not be a file', '2fast', "can't be a file name"],
        ['the name of a file that already exists', 'appeal', 'already exists']
    ])('keeps asking for the name after %s', async (_case, rejected, message) => {
        using terminal = new PromptTerminal();
        const projectDir = makeProject({
            ...GATEWAY_BOT,
            'src/handlers/Appeal.ts': 'kept',
            'templates/Button/handlers/{{pascal name}}.ts.hbs': 'new'
        });
        const done = make(terminal, projectDir);

        await terminal.press(KEY.enter);
        await terminal.press(rejected, KEY.enter);
        await settled(async () => expect(await terminal.screen()).toContain(message));
        await terminal.press(...rejected.split('').map(() => KEY.backspace), 'roll dice', KEY.enter);
        await done;

        expect(readFileSync(join(projectDir, 'src/handlers/Appeal.ts'), 'utf8')).toBe('kept');
        expect(readFileSync(join(projectDir, 'src/handlers/RollDice.ts'), 'utf8')).toBe('new');
    });
});
