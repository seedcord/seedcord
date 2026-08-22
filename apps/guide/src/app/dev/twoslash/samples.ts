export interface Sample {
    heading: string;
    label: string;
    code: string;
}

export const SAMPLES: readonly Sample[] = [
    {
        heading: 'A wrong option name, deep in the line',
        label: 'src/commands/Ping.ts',
        code: [
            '// @errors: 2345',
            "import { SlashHandler, SlashRoute } from '@seedcord/gateway';",
            '',
            "@SlashRoute('ping')",
            "export class Ping extends SlashHandler<'ping'> {",
            '    public async execute(): Promise<void> {',
            "        const detailed = this.options.getBoolean('detaild');",
            '    }',
            '}'
        ].join('\n')
    },
    {
        heading: 'An error at the start of a line',
        label: 'src/config.ts',
        code: ['// @errors: 2304', 'timoutMs = 3000;'].join('\n')
    },
    {
        heading: 'A type query',
        label: 'src/routes.ts',
        code: ["const routes = ['ping', 'ban'] as const;", 'const first = routes[0];', '//    ^?'].join('\n')
    },
    {
        heading: 'A highlighted run',
        label: 'src/bot.ts',
        code: ['const token = process.env.DISCORD_BOT_TOKEN;', '//    ^^^^^', 'const ready = true;'].join('\n')
    },
    {
        heading: 'A clean sample, for the control',
        label: 'src/commands/Ping.ts',
        code: [
            "import { SlashHandler, SlashRoute } from '@seedcord/gateway';",
            '',
            "@SlashRoute('ping')",
            "export class Ping extends SlashHandler<'ping'> {",
            '    public async execute(): Promise<void> {',
            "        await this.reply('Pong');",
            '    }',
            '}'
        ].join('\n')
    }
];
