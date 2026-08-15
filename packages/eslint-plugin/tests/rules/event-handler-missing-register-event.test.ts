import dedent from 'dedent';

import rule from '#src/rules/event-handler-missing-register-event';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('event-handler-missing-register-event', rule, {
    valid: [
        // decorated event handlers, the real mock shape
        dedent`
            import { EventHandler, RegisterEvent } from 'seedcord';
            @RegisterEvent([Events.MessageCreate])
            export class PingPong extends EventHandler<Events.MessageCreate> {}
        `,
        dedent`
            import { EventHandler, RegisterEvent } from 'seedcord';
            @RegisterEvent([Events.MessageCreate, { frequency: 'once' }], [Events.MessageUpdate])
            export class PingPong extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {}
        `,
        // an aliased decorator import still counts
        dedent`
            import { EventHandler, RegisterEvent as RE } from 'seedcord';
            @RE([Events.MessageCreate])
            export class PingPong extends EventHandler<Events.MessageCreate> {}
        `,
        // a relative decorator import counts, the framework and user barrels resolve this way
        dedent`
            import { EventHandler } from 'seedcord';
            import { RegisterEvent } from './decorators/RegisterEvent';
            @RegisterEvent([Events.MessageCreate])
            export class PingPong extends EventHandler<Events.MessageCreate> {}
        `,
        // abstract base is not a concrete handler
        dedent`
            import { EventHandler } from 'seedcord';
            export abstract class BaseEvent extends EventHandler<Events.MessageCreate> {}
        `,
        // a same-named base from a non-seedcord module is not ours
        dedent`
            import { EventHandler } from './local';
            export class Foo extends EventHandler {}
        `,
        // not an event handler at all
        `export class Plain {}`
    ],
    invalid: [
        {
            code: dedent`
                import { EventHandler } from 'seedcord';
                export class PingPong extends EventHandler<Events.MessageCreate> {}
            `,
            errors: [{ messageId: 'missingRegister' }]
        },
        {
            // has a decorator, but not @RegisterEvent
            code: dedent`
                import { EventHandler } from 'seedcord';
                @LogUsage()
                export class PingPong extends EventHandler<Events.MessageCreate> {}
            `,
            errors: [{ messageId: 'missingRegister' }]
        },
        {
            // a same-named decorator from another module satisfies nothing
            code: dedent`
                import { EventHandler } from 'seedcord';
                import { RegisterEvent } from 'some-other-lib';
                @RegisterEvent([Events.MessageCreate])
                export class PingPong extends EventHandler<Events.MessageCreate> {}
            `,
            errors: [{ messageId: 'missingRegister' }]
        },
        {
            // aliased seedcord import
            code: dedent`
                import { EventHandler as EH } from '@seedcord/core';
                export class Foo extends EH<Events.Ready> {}
            `,
            errors: [{ messageId: 'missingRegister' }]
        },
        {
            // a concrete subclass of a same-file abstract handler base
            code: dedent`
                import { EventHandler } from 'seedcord';
                abstract class BaseEvent extends EventHandler<Events.MessageCreate> {}
                export class PingPong extends BaseEvent {}
            `,
            errors: [{ messageId: 'missingRegister' }]
        },
        {
            // a concrete subclass of a cross-file abstract handler base
            code: dedent`
                import { BaseEvent } from './project-bases';
                export class PingPong extends BaseEvent {}
            `,
            errors: [{ messageId: 'missingRegister' }]
        },
        {
            // an anonymous default export is still a concrete handler
            code: dedent`
                import { BaseEvent } from './project-bases';
                export default class extends BaseEvent {}
            `,
            errors: [{ messageId: 'missingRegister' }]
        }
    ]
});
