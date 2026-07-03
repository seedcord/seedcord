import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/seedcord/interaction-handler-missing-route';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('interaction-handler-missing-route', rule, {
    valid: [
        // decorated handlers, the real mock shape
        `import { SlashHandler } from 'seedcord';
@SlashRoute('probe')
export class Probe extends SlashHandler<'probe'> {
    async execute() {}
}`,
        `import { ButtonHandler } from 'seedcord';
@ButtonRoute(Board)
export class Nav extends ButtonHandler<[typeof Board]> {}`,
        `import { ContextMenuHandler } from 'seedcord';
@ContextMenuRoute(ApplicationCommandType.User, 'View Profile')
export class ViewProfile extends ContextMenuHandler<ApplicationCommandType.User> {}`,
        // a route decorator stacked under an unrelated one still counts
        `import { ButtonHandler } from 'seedcord';
@LogUsage()
@ButtonRoute(Board)
export class Nav extends ButtonHandler<[typeof Board]> {}`,
        // aliased import still resolves to the seedcord base
        `import { SlashHandler as SH } from 'seedcord';
@SlashRoute('probe')
export class Probe extends SH<'probe'> {}`,
        // abstract intermediate base is not a concrete handler
        `import { SlashHandler } from 'seedcord';
export abstract class BaseSlash extends SlashHandler<'x'> {}`,
        // a same-named base from a non-seedcord module is not ours
        `import { SlashHandler } from './local';
export class Local extends SlashHandler {}`,
        // not a handler at all
        `export class Plain {}`
    ],
    invalid: [
        {
            code: `import { SlashHandler } from 'seedcord';
export class BanHandler extends SlashHandler<'ban'> {
    async execute() {}
}`,
            errors: [{ messageId: 'missingRoute', data: { base: 'SlashHandler', decorator: 'SlashRoute' } }]
        },
        {
            code: `import { ButtonHandler } from 'seedcord';
export class Nav extends ButtonHandler<[typeof Board]> {}`,
            errors: [{ messageId: 'missingRoute', data: { base: 'ButtonHandler', decorator: 'ButtonRoute' } }]
        },
        {
            // has a decorator, but not a route one
            code: `import { AutocompleteHandler } from 'seedcord';
@LogUsage()
export class Auto extends AutocompleteHandler<'probe'> {}`,
            errors: [
                { messageId: 'missingRoute', data: { base: 'AutocompleteHandler', decorator: 'AutocompleteRoute' } }
            ]
        },
        {
            // aliased seedcord import, still flagged when undecorated
            code: `import { ModalHandler as MH } from '@seedcord/core';
export class Feedback extends MH<[typeof FeedbackId]> {}`,
            errors: [{ messageId: 'missingRoute', data: { base: 'ModalHandler', decorator: 'ModalRoute' } }]
        }
    ]
});
