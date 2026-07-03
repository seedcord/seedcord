import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/seedcord/event-handler-missing-register-event';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('event-handler-missing-register-event', rule, {
    valid: [
        // decorated event handlers, the real mock shape
        `import { EventHandler } from 'seedcord';
@RegisterEvent([Events.MessageCreate])
export class PingPong extends EventHandler<Events.MessageCreate> {}`,
        `import { EventHandler } from 'seedcord';
@RegisterEvent([Events.MessageCreate, { frequency: 'once' }], [Events.MessageUpdate])
export class PingPong extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {}`,
        // abstract base is not a concrete handler
        `import { EventHandler } from 'seedcord';
export abstract class BaseEvent extends EventHandler<Events.MessageCreate> {}`,
        // a same-named base from a non-seedcord module is not ours
        `import { EventHandler } from './local';
export class Foo extends EventHandler {}`,
        // not an event handler at all
        `export class Plain {}`
    ],
    invalid: [
        {
            code: `import { EventHandler } from 'seedcord';
export class PingPong extends EventHandler<Events.MessageCreate> {}`,
            errors: [{ messageId: 'missingRegister' }]
        },
        {
            // has a decorator, but not @RegisterEvent
            code: `import { EventHandler } from 'seedcord';
@LogUsage()
export class PingPong extends EventHandler<Events.MessageCreate> {}`,
            errors: [{ messageId: 'missingRegister' }]
        },
        {
            // aliased seedcord import
            code: `import { EventHandler as EH } from '@seedcord/core';
export class Foo extends EH<Events.Ready> {}`,
            errors: [{ messageId: 'missingRegister' }]
        }
    ]
});
