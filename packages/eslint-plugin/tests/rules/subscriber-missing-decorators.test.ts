import dedent from 'dedent';

import rule from '../../src/rules/subscriber-missing-decorators';
import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('subscriber-missing-decorators', rule, {
    valid: [
        dedent`
            import { Subscriber, Subscribe } from 'seedcord';
            @Subscribe('unknownException')
            export class LogSub extends Subscriber<'unknownException'> {}
        `,
        dedent`
            import { WebhookLog, Subscribe, WebhookUrl } from 'seedcord';
            @Subscribe('memberBanned')
            @WebhookUrl('BAN_LOG_WEBHOOK_URL')
            export class BanLog extends WebhookLog<'memberBanned'> {}
        `,
        // abstract intermediates only seed the base set
        dedent`
            import { WebhookLog } from 'seedcord';
            export abstract class BaseLog extends WebhookLog<'memberBanned'> {}
        `,
        dedent`
            import { Subscriber, Subscribe } from 'seedcord';
            abstract class BaseSub extends Subscriber<'unknownException'> {}
            @Subscribe('unknownException')
            export class LogSub extends BaseSub {}
        `,
        // a same-named base from a non-seedcord module
        dedent`
            import { Subscriber } from './local';
            export class Foo extends Subscriber {}
        `,
        `export class Plain {}`
    ],
    invalid: [
        {
            code: dedent`
                import { Subscriber } from 'seedcord';
                export class LogSub extends Subscriber<'unknownException'> {}
            `,
            errors: [{ messageId: 'missingSubscribe' }]
        },
        {
            code: dedent`
                import { WebhookLog, Subscribe } from 'seedcord';
                @Subscribe('memberBanned')
                export class BanLog extends WebhookLog<'memberBanned'> {}
            `,
            errors: [{ messageId: 'missingWebhookUrl' }]
        },
        {
            // aliased seedcord import
            code: dedent`
                import { Subscriber as Sub } from '@seedcord/core';
                export class Foo extends Sub<'unknownException'> {}
            `,
            errors: [{ messageId: 'missingSubscribe' }]
        },
        {
            // a concrete subclass of a same-file abstract subscriber base
            code: dedent`
                import { Subscriber } from 'seedcord';
                abstract class BaseSub extends Subscriber<'unknownException'> {}
                export class LogSub extends BaseSub {}
            `,
            errors: [{ messageId: 'missingSubscribe' }]
        },
        {
            // a concrete subclass of a cross-file abstract reporter base
            code: dedent`
                import { BaseReporter } from './project-bases';
                @Subscribe('unknownException')
                export class BanLog extends BaseReporter {}
            `,
            errors: [{ messageId: 'missingWebhookUrl' }]
        },
        {
            // an anonymous default export is still a concrete subscriber
            code: dedent`
                import { BaseSub } from './project-bases';
                export default class extends BaseSub {}
            `,
            errors: [{ messageId: 'missingSubscribe' }]
        },
        {
            code: dedent`
                import { WebhookLog } from 'seedcord';
                export class BanLog extends WebhookLog<'memberBanned'> {}
            `,
            errors: [{ messageId: 'missingSubscribe' }, { messageId: 'missingWebhookUrl' }]
        },
        {
            code: dedent`
                import { WebhookLog, Subscribe } from 'seedcord';
                export abstract class BaseLog extends WebhookLog<'memberBanned'> {}
                @Subscribe('memberBanned')
                export class BanLog extends BaseLog {}
            `,
            errors: [{ messageId: 'missingWebhookUrl' }]
        }
    ]
});
