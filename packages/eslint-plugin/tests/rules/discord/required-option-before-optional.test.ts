import dedent from 'dedent';

import rule from '../../../src/rules/discord/required-option-before-optional';
import { createRuleTester } from '../../typed-rule-tester';

const ruleTester = createRuleTester();

ruleTester.run('required-option-before-optional', rule, {
    valid: [
        // required before optional, the correct order
        dedent`
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a').setRequired(true))
                .addStringOption((o) => o.setName('b'));
        `,
        // all required
        dedent`
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a').setRequired(true))
                .addStringOption((o) => o.setName('b').setRequired(true));
        `,
        // all optional
        dedent`
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a')).addStringOption((o) => o.setName('b'));
            `,
        // a dynamic setRequired means the order is not statically provable, left alone
        dedent`
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a'))
                .addStringOption((o) => o.setName('b'));
        `,
        // a dynamic setRequired means the order is not statically provable, left alone
        dedent`
            new SlashCommandBuilder()
                .addStringOption((o) => o.setName('a').setRequired(isReq))
                .addStringOption((o) => o.setName('b').setRequired(true));
        `
    ],
    invalid: [
        {
            // implicit optional (no setRequired) then required
            code: dedent`
                new SlashCommandBuilder()
                    .addStringOption((o) => o.setName('a'))
                    .addStringOption((o) => o.setName('b').setRequired(true));
            `,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // explicit optional then required
            code: dedent`
                new SlashCommandBuilder()
                    .addIntegerOption((o) => o.setName('a').setRequired(false))
                    .addStringOption((o) => o.setName('b').setRequired(true));
            `,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // seedcord command, options added through this.instance
            code: dedent`
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
                new SlashCommandBuilder()
                    .addStringOption((o) => { return o.setName('a'); })
                    .addStringOption((o) => { return o.setName('b').setRequired(true); });
            `,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // function expression callbacks are still analyzed
            code: dedent`
                new SlashCommandBuilder()
                    .addStringOption(function (o) { return o.setName('a'); })
                    .addStringOption(function (o) { return o.setName('b').setRequired(true); });
            `,
            errors: [{ messageId: 'outOfOrder' }]
        }
    ]
});
