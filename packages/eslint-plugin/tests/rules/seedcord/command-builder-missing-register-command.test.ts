import dedent from 'dedent';

import rule from '../../../src/rules/seedcord/command-builder-missing-register-command';
import { createRuleTester } from '../../typed-rule-tester';

const ruleTester = createRuleTester();

ruleTester.run('command-builder-missing-register-command', rule, {
    valid: [
        // registered commands, the real mock shape
        dedent`
            import { BuilderComponent } from '@seedcord/core';
            @RegisterCommand('global')
            export class ProbeCommand extends BuilderComponent<'command'> {}
        `,
        dedent`
            import { BuilderComponent } from '@seedcord/core';
            @RegisterCommand('global')
            export class ViewProfileCommand extends BuilderComponent<'context_menu'> {}
        `,
        dedent`
            import { BuilderComponent } from '@seedcord/core';
            @RegisterCommand('guild', ['123456789'])
            export class AdminCommand extends BuilderComponent<'command'> {}
        `,
        // non-command builders are not deployable, never flagged
        dedent`
            import { BuilderComponent } from '@seedcord/core';
            export class FeedCard extends BuilderComponent<'container'> {}
        `,
        dedent`
            import { BuilderComponent } from '@seedcord/core';
            export class Card extends BuilderComponent<'embed'> {}
        `,
        // nested slash pieces are not top-level commands
        dedent`
            import { BuilderComponent } from '@seedcord/core';
            class Group extends BuilderComponent<'group'> {}
        `,
        dedent`
            import { BuilderComponent } from '@seedcord/core';
            class Sub extends BuilderComponent<'subcommand'> {}
        `,
        // abstract base is not a concrete command
        dedent`
            import { BuilderComponent } from '@seedcord/core';
            export abstract class BaseCommand extends BuilderComponent<'command'> {}
        `,
        // a non-literal type arg is not statically a command
        dedent`
            import { BuilderComponent } from '@seedcord/core';
            export class Dyn extends BuilderComponent<Kind> {}
        `,
        // a same-named base from a non-seedcord module is not ours
        dedent`
            import { BuilderComponent } from './local';
            export class Foo extends BuilderComponent<'command'> {}
        `
    ],
    invalid: [
        {
            code: dedent`
                import { BuilderComponent } from '@seedcord/core';
                export class ProbeCommand extends BuilderComponent<'command'> {}
            `,
            errors: [{ messageId: 'missingRegister', data: { label: 'slash command' } }]
        },
        {
            code: dedent`
                import { BuilderComponent } from '@seedcord/core';
                export class ViewProfile extends BuilderComponent<'context_menu'> {}
            `,
            errors: [{ messageId: 'missingRegister', data: { label: 'context menu command' } }]
        },
        {
            // has a decorator, but not @RegisterCommand
            code: dedent`
                import { BuilderComponent } from '@seedcord/core';
                @LogUsage()
                export class ProbeCommand extends BuilderComponent<'command'> {}
            `,
            errors: [{ messageId: 'missingRegister', data: { label: 'slash command' } }]
        },
        {
            // the seedcord re-export path
            code: dedent`
                import { BuilderComponent } from 'seedcord';
                export class FeedCommand extends BuilderComponent<'command'> {}
            `,
            errors: [{ messageId: 'missingRegister', data: { label: 'slash command' } }]
        },
        {
            // aliased BuilderComponent import, still tracked by its local name
            code: dedent`
                import { BuilderComponent as BC } from '@seedcord/core';
                export class FeedCommand extends BC<'command'> {}
            `,
            errors: [{ messageId: 'missingRegister', data: { label: 'slash command' } }]
        },
        {
            // a concrete subclass of a same-file abstract command base, kind carried from the base
            code: dedent`
                import { BuilderComponent } from '@seedcord/core';
                abstract class BaseCommand extends BuilderComponent<'command'> {}
                export class ProbeCommand extends BaseCommand {}
            `,
            errors: [{ messageId: 'missingRegister', data: { label: 'slash command' } }]
        }
    ]
});
