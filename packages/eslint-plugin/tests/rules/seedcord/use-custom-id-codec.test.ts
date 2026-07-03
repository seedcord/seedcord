import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/seedcord/use-custom-id-codec';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('use-custom-id-codec', rule, {
    valid: [
        // the codec is the intended path, an encode() call is not a raw literal
        'new ButtonBuilder().setCustomId(ApproveId.encode({ userId: id, action: "approve" })).setLabel("Approve");',
        // member encode(), the pagination cursor pattern
        'new ButtonBuilder().setCustomId(cursor.encode({ page: 0, slot: 1 }));',
        // a pre-encoded id held in a variable
        'new ButtonBuilder().setCustomId(prevId).setStyle(ButtonStyle.Secondary);',
        // fixed framework ids kept as named constants
        'new ButtonBuilder().setCustomId(CONFIRM_IDS.confirm);',
        'button.setCustomId(disabled ? CONFIRM_IDS.cancel : CONFIRM_IDS.confirm);',
        // a helper that returns an encoded id
        'button.setCustomId(buildId(userId));',
        // a string literal on a different setter is not our target
        'new ButtonBuilder().setLabel("Approve").setStyle(ButtonStyle.Primary);'
    ],
    invalid: [
        {
            code: 'new ButtonBuilder().setCustomId("approve").setLabel("Approve").setStyle(ButtonStyle.Primary);',
            errors: [{ messageId: 'rawCustomId' }]
        },
        // hand-rolled dynamic id through interpolation, exactly what the codec replaces
        {
            code: 'new ButtonBuilder().setCustomId(`go:${text}`).setLabel("Go");',
            errors: [{ messageId: 'rawCustomId' }]
        },
        { code: 'button.setCustomId(`confirm`);', errors: [{ messageId: 'rawCustomId' }] },
        { code: 'new StringSelectMenuBuilder().setCustomId("pick-role");', errors: [{ messageId: 'rawCustomId' }] },
        {
            code: 'new ModalBuilder().setCustomId("feedback-modal").setTitle("Feedback");',
            errors: [{ messageId: 'rawCustomId' }]
        }
    ]
});
