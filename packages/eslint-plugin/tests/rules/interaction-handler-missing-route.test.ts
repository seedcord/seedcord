import dedent from 'dedent';

import rule from '@src/rules/interaction-handler-missing-route';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('interaction-handler-missing-route', rule, {
    valid: [
        // decorated handlers, the real mock shape
        dedent`
            import { SlashHandler, SlashRoute } from 'seedcord';
            @SlashRoute('probe')
            export class Probe extends SlashHandler<'probe'> {
                async execute() {}
            }
        `,
        dedent`
            import { ButtonHandler, ButtonRoute } from 'seedcord';
            @ButtonRoute(Board)
            export class Nav extends ButtonHandler<[typeof Board]> {}
        `,
        dedent`
            import { ContextMenuHandler, ContextMenuRoute } from 'seedcord';
            @ContextMenuRoute(ApplicationCommandType.User, 'View Profile')
            export class ViewProfile extends ContextMenuHandler<ApplicationCommandType.User> {}
        `,
        // a route decorator stacked under an unrelated one still counts
        dedent`
            import { ButtonHandler, ButtonRoute } from 'seedcord';
            @LogUsage()
            @ButtonRoute(Board)
            export class Nav extends ButtonHandler<[typeof Board]> {}
        `,
        // aliased import still resolves to the seedcord base
        dedent`
            import { SlashHandler as SH, SlashRoute } from 'seedcord';
            @SlashRoute('probe')
            export class Probe extends SH<'probe'> {}
        `,
        // an aliased route decorator still counts
        dedent`
            import { SlashHandler, SlashRoute as SR } from 'seedcord';
            @SR('probe')
            export class Probe extends SlashHandler<'probe'> {}
        `,
        // a relative decorator import counts, the framework and user barrels resolve this way
        dedent`
            import { SlashHandler } from 'seedcord';
            import { SlashRoute } from './decorators/SlashRoute';
            @SlashRoute('probe')
            export class Probe extends SlashHandler<'probe'> {}
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
            import { SelectMenuHandler, SelectMenuRoute } from 'seedcord';
            @SelectMenuRoute(Menu)
            export class Picker extends SelectMenuHandler<[typeof Menu]> {}
        `,
        // autocomplete handler with its route
        dedent`
            import { AutocompleteHandler, AutocompleteRoute } from 'seedcord';
            @AutocompleteRoute('search')
            export class Search extends AutocompleteHandler<'search'> {}
        `,
        // modal handler with its route
        dedent`
            import { ModalHandler, ModalRoute } from 'seedcord';
            @ModalRoute(Feedback)
            export class FeedbackModal extends ModalHandler<[typeof Feedback]> {}
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
                import { SlashHandler, ButtonRoute } from 'seedcord';
                @ButtonRoute('x')
                export class Mismatch extends SlashHandler<'ban'> {
                    async execute() {}
                }
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'SlashHandler', decorator: 'SlashRoute' } }]
        },
        {
            // a same-named route decorator from another module satisfies nothing
            code: dedent`
                import { SlashHandler } from 'seedcord';
                import { SlashRoute } from 'some-other-lib';
                @SlashRoute('ban')
                export class BanHandler extends SlashHandler<'ban'> {}
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
        },
        {
            // a concrete subclass of a cross-file abstract handler base
            code: dedent`
                import { BaseSlash } from './project-bases';
                export class BanHandler extends BaseSlash {}
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'SlashHandler', decorator: 'SlashRoute' } }]
        },
        {
            // an anonymous default export is still a concrete handler
            code: dedent`
                import { BaseSlash } from './project-bases';
                export default class extends BaseSlash {}
            `,
            errors: [{ messageId: 'missingRoute', data: { base: 'SlashHandler', decorator: 'SlashRoute' } }]
        }
    ]
});
