import dedent from 'dedent';

import rule from '../../../src/rules/seedcord/interaction-handler-missing-route';
import { createRuleTester } from '../../typed-rule-tester';

const ruleTester = createRuleTester();

ruleTester.run('interaction-handler-missing-route', rule, {
    valid: [
        // decorated handlers, the real mock shape
        dedent`
            import { SlashHandler } from 'seedcord';
            @SlashRoute('probe')
            export class Probe extends SlashHandler<'probe'> {
                async execute() {}
            }
        `,
        dedent`
            import { ButtonHandler } from 'seedcord';
            @ButtonRoute(Board)
            export class Nav extends ButtonHandler<[typeof Board]> {}
        `,
        dedent`
            import { ContextMenuHandler } from 'seedcord';
            @ContextMenuRoute(ApplicationCommandType.User, 'View Profile')
            export class ViewProfile extends ContextMenuHandler<ApplicationCommandType.User> {}
        `,
        // a route decorator stacked under an unrelated one still counts
        dedent`
            import { ButtonHandler } from 'seedcord';
            @LogUsage()
            @ButtonRoute(Board)
            export class Nav extends ButtonHandler<[typeof Board]> {}
        `,
        // aliased import still resolves to the seedcord base
        dedent`
            import { SlashHandler as SH } from 'seedcord';
            @SlashRoute('probe')
            export class Probe extends SH<'probe'> {}
        `,
        // abstract intermediate base is not a concrete handler
        dedent`
            import { SlashHandler } from 'seedcord';
            export abstract class BaseSlash extends SlashHandler<'x'> {}
        `,
        // a same-named base from a non-seedcord module is not ours
        dedent`
            import { SlashHandler } from './local';
            export class Local extends SlashHandler {}
        `,
        // select menu handler with its route
        dedent`
            import { SelectMenuHandler } from 'seedcord';
            @SelectMenuRoute(Menu)
            export class Picker extends SelectMenuHandler<[typeof Menu]> {}
        `,
        // autocomplete handler with its route
        dedent`
            import { AutocompleteHandler } from 'seedcord';
            @AutocompleteRoute('search')
            export class Search extends AutocompleteHandler<'search'> {}
        `,
        // not a handler at all
        `export class Plain {}`
    ],
    invalid: [
        {
            code: dedent`
                import { SlashHandler } from 'seedcord';
                export class BanHandler extends SlashHandler<'ban'> {
                    async execute() {}
                }
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'SlashHandler', decorator: 'SlashRoute' } }]
        },
        {
            // the wrong route decorator does not register a slash handler
            code: dedent`
                import { SlashHandler } from 'seedcord';
                @ButtonRoute('x')
                export class Mismatch extends SlashHandler<'ban'> {
                    async execute() {}
                }
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'SlashHandler', decorator: 'SlashRoute' } }]
        },
        {
            code: dedent`
                import { ButtonHandler } from 'seedcord';
                export class Nav extends ButtonHandler<[typeof Board]> {}
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'ButtonHandler', decorator: 'ButtonRoute' } }]
        },
        {
            // has a decorator, but not a route one
            code: dedent`
                import { AutocompleteHandler } from 'seedcord';
                @LogUsage()
                export class Auto extends AutocompleteHandler<'probe'> {}
            `,
            errors: [
                { messageId: 'missingRoute', data: { base: 'AutocompleteHandler', decorator: 'AutocompleteRoute' } }
            ]
        },
        {
            // aliased seedcord import, still flagged when undecorated
            code: dedent`
                import { ModalHandler as MH } from '@seedcord/core';
                export class Feedback extends MH<[typeof FeedbackId]> {}
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'ModalHandler', decorator: 'ModalRoute' } }]
        },
        {
            // select menu handler without a route
            code: dedent`
                import { SelectMenuHandler } from 'seedcord';
                export class Picker extends SelectMenuHandler<[typeof Menu]> {}
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'SelectMenuHandler', decorator: 'SelectMenuRoute' } }]
        },
        {
            // context menu handler without a route
            code: dedent`
                import { ContextMenuHandler } from 'seedcord';
                export class ViewProfile extends ContextMenuHandler<ApplicationCommandType.User> {}
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'ContextMenuHandler', decorator: 'ContextMenuRoute' } }]
        },
        {
            // a concrete subclass of a same-file abstract handler base
            code: dedent`
                import { SlashHandler } from 'seedcord';
                abstract class BaseSlash extends SlashHandler<'x'> {}
                export class Ban extends BaseSlash {}
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'SlashHandler', decorator: 'SlashRoute' } }]
        }
    ]
});
