import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/discord/required-option-before-optional';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('required-option-before-optional', rule, {
    valid: [
        // required before optional, the correct order
        `new SlashCommandBuilder().addStringOption((o) => o.setName('a').setRequired(true)).addStringOption((o) => o.setName('b'));`,
        // all required
        `new SlashCommandBuilder().addStringOption((o) => o.setName('a').setRequired(true)).addStringOption((o) => o.setName('b').setRequired(true));`,
        // all optional
        `new SlashCommandBuilder().addStringOption((o) => o.setName('a')).addStringOption((o) => o.setName('b'));`,
        // a dynamic setRequired means the order is not statically provable, left alone
        `new SlashCommandBuilder().addStringOption((o) => o.setName('a').setRequired(isReq)).addStringOption((o) => o.setName('b').setRequired(true));`
    ],
    invalid: [
        {
            // implicit optional (no setRequired) then required
            code: `new SlashCommandBuilder().addStringOption((o) => o.setName('a')).addStringOption((o) => o.setName('b').setRequired(true));`,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // explicit optional then required
            code: `new SlashCommandBuilder().addIntegerOption((o) => o.setName('a').setRequired(false)).addStringOption((o) => o.setName('b').setRequired(true));`,
            errors: [{ messageId: 'outOfOrder' }]
        },
        {
            // seedcord command, options added through this.instance
            code: `class MyCommand extends BuilderComponent<'command'> {
    constructor() {
        super('command');
        this.instance.addStringOption((o) => o.setName('a')).addStringOption((o) => o.setName('b').setRequired(true));
    }
}`,
            errors: [{ messageId: 'outOfOrder' }]
        }
    ]
});
