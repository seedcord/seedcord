import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/discord/no-conflicting-button-props';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-conflicting-button-props', rule, {
    valid: [
        // a normal button, customId only
        `new ButtonBuilder().setCustomId('approve').setLabel('Approve').setStyle(ButtonStyle.Primary);`,
        // a link button, url only
        `new ButtonBuilder().setStyle(ButtonStyle.Link).setURL('https://example.com').setLabel('Docs');`,
        // a non-link button with a customId, no url
        `new ButtonBuilder().setLabel('x').setStyle(ButtonStyle.Secondary).setCustomId('y');`,
        // split across statements, not one chain, left alone
        `const b = new ButtonBuilder().setCustomId('x');
b.setURL('https://example.com');`
    ],
    invalid: [
        {
            code: `new ButtonBuilder().setCustomId('x').setURL('https://example.com').setLabel('y');`,
            errors: [{ messageId: 'idAndUrl' }]
        },
        {
            code: `new ButtonBuilder().setStyle(ButtonStyle.Link).setCustomId('x').setLabel('y');`,
            errors: [{ messageId: 'linkWithCustomId' }]
        }
    ]
});
