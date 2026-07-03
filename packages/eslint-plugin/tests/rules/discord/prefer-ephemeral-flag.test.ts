import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/discord/prefer-ephemeral-flag';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('prefer-ephemeral-flag', rule, {
    valid: [
        // already using flags
        `interaction.reply({ content: 'hi', flags: MessageFlags.Ephemeral });`,
        // no ephemeral option at all
        `interaction.reply({ content: 'hi' });`,
        // a method that is not an interaction reply, left alone
        `channel.send({ ephemeral: true });`
    ],
    invalid: [
        {
            // autofixed because MessageFlags is imported and there is no existing flags key
            code: `import { MessageFlags } from 'discord.js';
interaction.reply({ content: 'hi', ephemeral: true });`,
            output: `import { MessageFlags } from 'discord.js';
interaction.reply({ content: 'hi', flags: MessageFlags.Ephemeral });`,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            code: `import { MessageFlags } from 'discord.js';
interaction.deferReply({ ephemeral: true });`,
            output: `import { MessageFlags } from 'discord.js';
interaction.deferReply({ flags: MessageFlags.Ephemeral });`,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // ephemeral: false is still deprecated, flagged but not auto-rewritten
            code: `interaction.followUp({ ephemeral: false, content: 'x' });`,
            output: null,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // MessageFlags is not imported, so the flag stays but no fix is applied
            code: `interaction.reply({ ephemeral: true });`,
            output: null,
            errors: [{ messageId: 'deprecated' }]
        }
    ]
});
