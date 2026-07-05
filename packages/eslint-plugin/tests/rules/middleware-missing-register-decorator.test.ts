import dedent from 'dedent';

import rule from '../../src/rules/middleware-missing-register-decorator';
import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('middleware-missing-register-decorator', rule, {
    valid: [
        // decorated middleware, the real shape
        dedent`
            import { EventMiddleware } from 'seedcord';
            @Middleware(MiddlewareType.Event, 0)
            export class LogMw extends EventMiddleware {}
        `,
        dedent`
            import { InteractionMiddleware } from 'seedcord';
            @Middleware(MiddlewareType.Interaction, 0)
            export class AuthMw extends InteractionMiddleware<Repliables> {}
        `,
        dedent`
            import { EventMiddleware } from 'seedcord';
            @Middleware(MiddlewareType.Event, 5, { events: [Events.MessageCreate] })
            export class MsgMw extends EventMiddleware<Events.MessageCreate> {}
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
                export class AuthMw extends InteractionMiddleware<Repliables> {}
            `,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // has a decorator, but not @Middleware
            code: dedent`
                import { EventMiddleware } from 'seedcord';
                @LogUsage()
                export class LogMw extends EventMiddleware<Events.MessageCreate> {}
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
        }
    ]
});
