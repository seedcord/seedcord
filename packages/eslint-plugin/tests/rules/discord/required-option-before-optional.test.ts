import dedent from 'dedent';

import rule from '../../../src/rules/discord/required-option-before-optional';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('required-option-before-optional', rule, {
    valid: [
        // required before optional, the correct order
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a').setRequired(true))
                .addStringOption((o) => o.setName('b'));
        `,
        // all required
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a').setRequired(true))
                .addStringOption((o) => o.setName('b').setRequired(true));
        `,
        // all optional
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a')).addStringOption((o) => o.setName('b'));
        `,
        // all optional, separate lines
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a'))
                .addStringOption((o) => o.setName('b'));
        `,
        // dynamic setRequired is not statically provable, left alone
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            declare const isReq: boolean;
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a').setRequired(isReq))
                .addStringOption((o) => o.setName('b').setRequired(true));
        `,
        // a non-djs class with matching method names is not a slash command builder
        dedent`
            class FormSchema {
                addStringOption(fn: (o: { setRequired(r: boolean): unknown }) => unknown): this { return this; }
                addIntegerOption(fn: (o: { setRequired(r: boolean): unknown }) => unknown): this { return this; }
            }
            new FormSchema()
                .addStringOption((o) => o.setRequired(false))
                .addIntegerOption((o) => o.setRequired(true));
        `,
        // 3 options: required, required, optional
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a').setRequired(true))
                .addStringOption((o) => o.setName('b').setRequired(true))
                .addStringOption((o) => o.setName('c'));
        `,
        // a const flag resolves through its literal type, required then optional is the correct order
        dedent`
            import { SlashCommandBuilder } from 'discord.js';
            const REQ = true;
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a').setRequired(REQ))
                .addStringOption((o) => o.setName('b'));
        `
    ],
    invalid: [
        {
            // implicit optional (no setRequired) then required
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder()
                    .addStringOption((o) => o.setName('a'))
                    .addStringOption((o) => o.setName('b').setRequired(true));
            `,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // a const flag resolves through its literal type
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                const REQ = true;
                new SlashCommandBuilder()
                    .addStringOption((o) => o.setName('a'))
                    .addStringOption((o) => o.setName('b').setRequired(REQ));
            `,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // explicit optional then required
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder()
                    .addIntegerOption((o) => o.setName('a').setRequired(false))
                    .addStringOption((o) => o.setName('b').setRequired(true));
            `,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // seedcord command, options added through this.instance
            code: dedent`
                import { BuilderComponent } from './seedcord';
                class MyCommand extends BuilderComponent<'command'> {
                    constructor() {
                        super('command');
                        this.instance
                            .addStringOption((o) => o.setName('a'))
                            .addStringOption((o) => o.setName('b').setRequired(true));
                    }
                }
            `,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // block-bodied arrow callbacks are still analyzed
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder()
                    .addStringOption((o) => { return o.setName('a'); })
                    .addStringOption((o) => { return o.setName('b').setRequired(true); });
            `,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // function expression callbacks are still analyzed
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder()
                    .addStringOption(function (o) { return o.setName('a'); })
                    .addStringOption(function (o) { return o.setName('b').setRequired(true); });
            `,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // 3 options: optional, optional, required, the error points at the third option
            code: dedent`
                import { SlashCommandBuilder } from 'discord.js';
                new SlashCommandBuilder()
                    .addStringOption((o) => o.setName('a'))
                    .addStringOption((o) => o.setName('b'))
                    .addStringOption((o) => o.setName('c').setRequired(true));
            `,
            errors: [{ messageId: 'outOfOrder', line: 5 }]
        },
        {
            // a subcommand builder is validated the same way
            code: dedent`
                import { SlashCommandSubcommandBuilder } from 'discord.js';
                new SlashCommandSubcommandBuilder()
                    .addStringOption((o) => o.setName('a'))
                    .addStringOption((o) => o.setName('b').setRequired(true));
            `,
            errors: [{ messageId: 'outOfOrder' }]
        }
    ]
});
