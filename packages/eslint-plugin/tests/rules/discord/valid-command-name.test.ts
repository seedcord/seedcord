import dedent from 'dedent';

import rule from '../../../src/rules/discord/valid-command-name';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('valid-command-name', rule, {
    valid: [
        // valid lowercase command names
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder().setName('ban').setDescription('d');
        `,
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder().setName('ban-user');
        `,
        // a valid option name, resolved through the option callback parameter's type
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder().addStringOption((o) => o.setName('target').setDescription('d'));
        `,
        // a context menu command name may use spaces and uppercase, so it is left alone
        dedent`
            import { ContextMenuCommandBuilder } from 'discord.js';
            new ContextMenuCommandBuilder().setName('View Profile');
        `,
        // seedcord context menu command, also left alone
        dedent`
            import { BuilderComponent } from './seedcord';
            class ViewProfile extends BuilderComponent<'context_menu'> {
                constructor() {
                    super('context_menu');
                    this.instance.setName('View Profile');
                }
            }
        `,
        // a setName on an unrelated receiver is not a slash builder
        dedent`
            declare const thing: { setName(name: string): void };
            thing.setName('Not A Command');
        `,
        // a user class whose name only starts with SlashCommand is not a real slash builder
        dedent`
            class SlashCommandTestHarness {
                setName(name: string): this {
                    return this;
                }
            }
            new SlashCommandTestHarness().setName('My Bad Name');
        `,
        // a subcommand name, also lowercase
        dedent`
            import { SlashCommandSubcommandBuilder } from 'discord.js';
            new SlashCommandSubcommandBuilder().setName('sub-name');
        `,
        // a subcommand group name, also lowercase
        dedent`
            import { SlashCommandSubcommandGroupBuilder } from 'discord.js';
            new SlashCommandSubcommandGroupBuilder().setName('my-group');
        `,
        // 32-char name is exactly at the upper boundary and must be valid
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder().setName('abcdefghijklmnopqrstuvwxyz123456');
        `,
        // Discord accepts Thai and Devanagari localized names, which use combining marks
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder().setName('ชื่อ');
        `,
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder().setName('हिन्दी');
        `
    ],
    invalid: [
        {
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder().setName('Ban');
            `,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder().setName('ban user');
            `,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            // option name, resolved through the callback parameter's type
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder().addStringOption((o) => o.setName('Target'));
            `,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            // seedcord slash command with an invalid name
            code: dedent`
                import { BuilderComponent } from './seedcord';
                class Ban extends BuilderComponent<'command'> {
                    constructor() {
                        super('command');
                        this.instance.setName('Ban');
                    }
                }
            `,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            // a no-expression template literal is a static name and must still be valid
            code: `import { SlashCommandBuilder } from 'discord.js';
new SlashCommandBuilder().setName(\`Ban\`);`,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            // a subcommand name with a space
            code: dedent`
                import { SlashCommandSubcommandBuilder } from 'discord.js';
                new SlashCommandSubcommandBuilder().setName('Sub Name');
            `,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            // a subcommand group name with uppercase and space
            code: dedent`
                import { SlashCommandSubcommandGroupBuilder } from 'discord.js';
                new SlashCommandSubcommandGroupBuilder().setName('My Group');
            `,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            // 33-char name is one over the limit and must be invalid
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder().setName('abcdefghijklmnopqrstuvwxyz1234567');
            `,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            // a union-typed receiver has no single symbol, so extendsDjsType walks its members
            code: dedent`
                import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
                declare const b: SlashCommandBuilder | SlashCommandSubcommandBuilder;
                b.setName('Invalid Name');
            `,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            // a subclass reports its own symbol name, so extendsDjsType walks the base chain
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                class MyBuilder extends SlashCommandBuilder {}
                new MyBuilder().setName('Ban User');
            `,
            errors: [{ messageId: 'invalidName' }]
        },
        {
            // a directly-constructed option builder name is validated like a command name
            code: dedent`
                import { SlashCommandIntegerOption } from 'discord.js';
                new SlashCommandIntegerOption().setName('Bad Name');
            `,
            errors: [{ messageId: 'invalidName' }]
        }
    ]
});
