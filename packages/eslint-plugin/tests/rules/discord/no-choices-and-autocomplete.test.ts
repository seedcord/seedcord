import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/discord/no-choices-and-autocomplete';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-choices-and-autocomplete', rule, {
    valid: [
        // autocomplete alone
        `new SlashCommandStringOption().setName('q').setDescription('d').setAutocomplete(true);`,
        // choices alone
        `new SlashCommandStringOption().setName('q').setDescription('d').addChoices({ name: 'A', value: 'a' });`,
        // autocomplete explicitly off, choices are fine
        `new SlashCommandStringOption().setName('q').setAutocomplete(false).addChoices({ name: 'A', value: 'a' });`,
        // split across statements, not a single chain, left alone
        `const opt = new SlashCommandStringOption().setName('q');
opt.setAutocomplete(true);
opt.addChoices({ name: 'A', value: 'a' });`,
        // dynamic choices spread, count is not statically known, left alone
        `new SlashCommandStringOption().setName('q').setAutocomplete(true).addChoices(...dynamicChoices);`
    ],
    invalid: [
        {
            code: `new SlashCommandStringOption().setName('q').setDescription('d').setAutocomplete(true).addChoices({ name: 'A', value: 'a' });`,
            errors: [{ messageId: 'bothSet' }]
        },
        {
            // reversed order
            code: `new SlashCommandStringOption().setName('q').addChoices({ name: 'A', value: 'a' }).setAutocomplete(true);`,
            errors: [{ messageId: 'bothSet' }]
        },
        {
            // setChoices variant on an integer option
            code: `new SlashCommandIntegerOption().setName('n').setAutocomplete(true).setChoices({ name: 'One', value: 1 });`,
            errors: [{ messageId: 'bothSet' }]
        }
    ]
});
