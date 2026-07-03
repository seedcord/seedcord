import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/seedcord/command-builder-missing-register-command';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('command-builder-missing-register-command', rule, {
    valid: [
        // registered commands, the real mock shape
        `import { BuilderComponent } from '@seedcord/core';
@RegisterCommand('global')
export class ProbeCommand extends BuilderComponent<'command'> {}`,
        `import { BuilderComponent } from '@seedcord/core';
@RegisterCommand('global')
export class ViewProfileCommand extends BuilderComponent<'context_menu'> {}`,
        `import { BuilderComponent } from '@seedcord/core';
@RegisterCommand('guild', ['123456789'])
export class AdminCommand extends BuilderComponent<'command'> {}`,
        // non-command builders are not deployable, never flagged
        `import { BuilderComponent } from '@seedcord/core';
export class FeedCard extends BuilderComponent<'container'> {}`,
        `import { BuilderComponent } from '@seedcord/core';
export class Card extends BuilderComponent<'embed'> {}`,
        // nested slash pieces are not top-level commands
        `import { BuilderComponent } from '@seedcord/core';
class Group extends BuilderComponent<'group'> {}`,
        `import { BuilderComponent } from '@seedcord/core';
class Sub extends BuilderComponent<'subcommand'> {}`,
        // abstract base is not a concrete command
        `import { BuilderComponent } from '@seedcord/core';
export abstract class BaseCommand extends BuilderComponent<'command'> {}`,
        // a non-literal type arg is not statically a command
        `import { BuilderComponent } from '@seedcord/core';
export class Dyn extends BuilderComponent<Kind> {}`,
        // a same-named base from a non-seedcord module is not ours
        `import { BuilderComponent } from './local';
export class Foo extends BuilderComponent<'command'> {}`
    ],
    invalid: [
        {
            code: `import { BuilderComponent } from '@seedcord/core';
export class ProbeCommand extends BuilderComponent<'command'> {}`,
            errors: [{ messageId: 'missingRegister', data: { label: 'slash command' } }]
        },
        {
            code: `import { BuilderComponent } from '@seedcord/core';
export class ViewProfile extends BuilderComponent<'context_menu'> {}`,
            errors: [{ messageId: 'missingRegister', data: { label: 'context menu command' } }]
        },
        {
            // has a decorator, but not @RegisterCommand
            code: `import { BuilderComponent } from '@seedcord/core';
@LogUsage()
export class ProbeCommand extends BuilderComponent<'command'> {}`,
            errors: [{ messageId: 'missingRegister', data: { label: 'slash command' } }]
        },
        {
            // the seedcord re-export path
            code: `import { BuilderComponent } from 'seedcord';
export class FeedCommand extends BuilderComponent<'command'> {}`,
            errors: [{ messageId: 'missingRegister', data: { label: 'slash command' } }]
        }
    ]
});
