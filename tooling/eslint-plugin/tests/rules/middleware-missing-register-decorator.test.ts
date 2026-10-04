import dedent from 'dedent';

import rule from '#src/rules/middleware-missing-register-decorator';
import { createTypedRuleTester } from '#tests/typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('middleware-missing-register-decorator', rule, {
    valid: [
        // decorated middleware, the real shape
        dedent`
            import { EventMiddleware, RegisterEventMiddleware } from 'seedcord';
            @RegisterEventMiddleware()
            export class LogMw extends EventMiddleware {}
        `,
        dedent`
            import { InteractionMiddleware, RegisterInteractionMiddleware } from 'seedcord';
            @RegisterInteractionMiddleware()
            export class AuthMw extends InteractionMiddleware {}
        `,
        dedent`
            import { EventMiddleware, RegisterEventMiddleware } from 'seedcord';
            @RegisterEventMiddleware({ events: [Events.MessageCreate], priority: 5 })
            export class MsgMw extends EventMiddleware<Events.MessageCreate> {}
        `,
        // an aliased decorator import still counts
        dedent`
            import { EventMiddleware, RegisterEventMiddleware as Mw } from 'seedcord';
            @Mw()
            export class LogMw extends EventMiddleware {}
        `,
        // a relative decorator import counts, the framework and user barrels resolve this way
        dedent`
            import { EventMiddleware } from 'seedcord';
            import { RegisterEventMiddleware } from './decorators/Middleware';
            @RegisterEventMiddleware()
            export class LogMw extends EventMiddleware {}
        `,
        // abstract base is not a concrete middleware
        dedent`
            import { EventMiddleware } from 'seedcord';
            export abstract class BaseMw extends EventMiddleware {}
        `,
        // a same-named base from a non-seedcord module is not ours
        dedent`
            import { EventMiddleware } from './local';
            export class Foo extends EventMiddleware {}
        `,
        // not a middleware at all
        `export class Plain {}`
    ],
    invalid: [
        {
            code: dedent`
                import { EventMiddleware } from 'seedcord';
                export class LogMw extends EventMiddleware {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            code: dedent`
                import { InteractionMiddleware } from 'seedcord';
                export class AuthMw extends InteractionMiddleware {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // each base takes its own decorator
            code: dedent`
                import { EventMiddleware, RegisterInteractionMiddleware } from 'seedcord';
                @RegisterInteractionMiddleware()
                export class LogMw extends EventMiddleware {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            code: dedent`
                import { InteractionMiddleware, RegisterEventMiddleware } from 'seedcord';
                @RegisterEventMiddleware()
                export class AuthMw extends InteractionMiddleware {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // has a decorator, but not a register one
            code: dedent`
                import { EventMiddleware } from 'seedcord';
                @LogUsage()
                export class LogMw extends EventMiddleware<Events.MessageCreate> {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // a same-named decorator from another module satisfies nothing
            code: dedent`
                import { EventMiddleware } from 'seedcord';
                import { RegisterEventMiddleware } from 'some-other-lib';
                @RegisterEventMiddleware()
                export class LogMw extends EventMiddleware {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // aliased seedcord import
            code: dedent`
                import { EventMiddleware as EM } from '@seedcord/core';
                export class Foo extends EM {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // a concrete subclass of a same-file abstract middleware base
            code: dedent`
                import { EventMiddleware } from 'seedcord';
                abstract class BaseMw extends EventMiddleware {}
                export class LogMw extends BaseMw {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // a concrete subclass of a cross-file abstract middleware base
            code: dedent`
                import { BaseMw } from './project-bases';
                export class LogMw extends BaseMw {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // an anonymous default export is still a concrete middleware
            code: dedent`
                import { BaseMw } from './project-bases';
                export default class extends BaseMw {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        }
    ]
});
