import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/seedcord/middleware-missing-register-decorator';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('middleware-missing-register-decorator', rule, {
    valid: [
        // decorated middleware, the real shape
        `import { EventMiddleware } from 'seedcord';
@Middleware(MiddlewareType.Event, 0)
export class LogMw extends EventMiddleware {}`,
        `import { InteractionMiddleware } from 'seedcord';
@Middleware(MiddlewareType.Interaction, 0)
export class AuthMw extends InteractionMiddleware<Repliables> {}`,
        `import { EventMiddleware } from 'seedcord';
@Middleware(MiddlewareType.Event, 5, { events: [Events.MessageCreate] })
export class MsgMw extends EventMiddleware<Events.MessageCreate> {}`,
        // abstract base is not a concrete middleware
        `import { EventMiddleware } from 'seedcord';
export abstract class BaseMw extends EventMiddleware {}`,
        // a same-named base from a non-seedcord module is not ours
        `import { EventMiddleware } from './local';
export class Foo extends EventMiddleware {}`,
        // not a middleware at all
        `export class Plain {}`
    ],
    invalid: [
        {
            code: `import { EventMiddleware } from 'seedcord';
export class LogMw extends EventMiddleware {}`,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            code: `import { InteractionMiddleware } from 'seedcord';
export class AuthMw extends InteractionMiddleware<Repliables> {}`,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // has a decorator, but not @Middleware
            code: `import { EventMiddleware } from 'seedcord';
@LogUsage()
export class LogMw extends EventMiddleware<Events.MessageCreate> {}`,
            errors: [{ messageId: 'missingMiddleware' }]
        },
        {
            // aliased seedcord import
            code: `import { EventMiddleware as EM } from '@seedcord/core';
export class Foo extends EM {}`,
            errors: [{ messageId: 'missingMiddleware' }]
        }
    ]
});
